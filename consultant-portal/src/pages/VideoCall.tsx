import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

interface VideoCallProps {
  roomId?: string;
  consultationId?: string;
}

export default function VideoCall({ roomId, consultationId }: VideoCallProps) {
  const [status, setStatus] = useState<'connecting' | 'waiting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isStarted = useRef(false);

  // Get the current user identity
  const isConsultant = (() => {
    try {
      return Boolean(JSON.parse(localStorage.getItem('consultant_session') || 'null'));
    } catch { return false; }
  })();

  const userId = isConsultant ? 'consultant' : 'farmer';

  const startCall = useCallback(async () => {
    if (!roomId) {
      setError('No room ID provided');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: true,
        });
      } catch (mediaErr) {
        console.warn('Camera/Mic failed, creating hardware-zero dummy stream fallback:', mediaErr);
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#10b981'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
          ctx.fillText('Camera Offline', canvas.width/2, canvas.height/2 - 20);
          ctx.font = '20px Arial';
          ctx.fillText('(Hardware Conflict)', canvas.width/2, canvas.height/2 + 20);
        }
        stream = canvas.captureStream(15);
        
        // Pure software audio fallback
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const dest = audioCtx.createMediaStreamDestination();
          const oscillator = audioCtx.createOscillator();
          oscillator.frequency.value = 0; // Silent
          oscillator.connect(dest);
          oscillator.start();
          stream.addTrack(dest.stream.getAudioTracks()[0]);
        } catch (e) { console.error('AudioContext fallback failed too', e); }
      }
      
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect to signaling server
      const socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        setStatus('waiting');
        socket.emit('join-room', roomId, userId);
      });

      // When other user's list arrives (they were already in the room)
      socket.on('room-users', (users: string[]) => {
        console.log('Room users:', users);
        if (users.length > 0) {
          // Create offer and send to existing user
          createPeerConnection(socket, users[0]);
          makeOffer(users[0]);
        }
      });

      // When a new user joins
      socket.on('user-joined', ({ userId: uid, socketId }: { userId: string; socketId: string }) => {
        console.log('User joined:', uid, socketId);
        // The new joiner should initiate
        // If we're already here and they join, we wait for their offer
      });

      // Receive offer
      socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
        console.log('📥 Received offer from:', from);
        if (!pcRef.current) {
          createPeerConnection(socket, from);
        }
        await pcRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
        while (iceCandidateQueue.current.length > 0) {
          const c = iceCandidateQueue.current.shift();
          if (c) pcRef.current!.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
        }
        const answer = await pcRef.current!.createAnswer();
        await pcRef.current!.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer, to: from });
      });

      // Receive answer
      socket.on('answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
        console.log('📥 Received answer from:', from);
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          while (iceCandidateQueue.current.length > 0) {
            const c = iceCandidateQueue.current.shift();
            if (c) pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
          }
        }
      });

      // Receive ICE candidate
      socket.on('ice-candidate', ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
        if (pcRef.current && candidate) {
          if (pcRef.current.remoteDescription) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          } else {
            iceCandidateQueue.current.push(candidate);
          }
        }
      });

      // User left
      socket.on('user-left', ({ socketId }: { socketId: string }) => {
        console.log('User left:', socketId);
        setStatus('ended');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        clearInterval(timerRef.current);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setError('Failed to connect to signaling server');
      });

    } catch (err: any) {
      console.error('Start call error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera/microphone permission denied. Please allow access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect a device and try again.');
      } else {
        setError(`Failed to start call: ${err.message}`);
      }
    }
  }, [roomId, userId]);

  const createPeerConnection = (socket: Socket, remoteSocketId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('📹 Got remote track');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setStatus('connected');
        // Start duration timer
        timerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
    };

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate.toJSON(),
          to: remoteSocketId,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setStatus('ended');
        clearInterval(timerRef.current);
      }
    };

    return pc;
  };

  const makeOffer = async (remoteSocketId: string) => {
    if (!pcRef.current) return;
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketRef.current?.emit('offer', {
      roomId,
      offer,
      to: remoteSocketId,
    });
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // End call
  const endCall = () => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('leave-room', roomId);
      socketRef.current.disconnect();
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    clearInterval(timerRef.current);
    setStatus('ended');
  };

  // Go back
  const goBack = () => {
    endCall();
    if (isConsultant) {
      window.location.hash = '#/dashboard';
    } else {
      window.location.hash = '#/officers';
    }
  };

  // Format duration
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isStarted.current) return;
    isStarted.current = true;
    startCall();
    return () => {
      endCall();
      isStarted.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50 z-10">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white hover:bg-slate-700 transition-all">
            ←
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
              📹 Video Consultation
            </h1>
            <p className="text-xs text-slate-400">Room: {roomId || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status === 'connected' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'pulse-glow 1.5s infinite' }}></span>
              <span className="text-emerald-300 text-sm font-bold">LIVE</span>
              <span className="text-emerald-400 text-sm font-mono">{formatDuration(callDuration)}</span>
            </div>
          )}
          {status === 'waiting' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }}></div>
              <span className="text-amber-300 text-sm font-bold">Waiting for other party...</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative p-4 md:p-8">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="glass rounded-3xl p-12 text-center max-w-lg">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
              <p className="text-slate-400 mb-6">{error}</p>
              <button onClick={goBack} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all">
                ← Go Back
              </button>
            </div>
          </div>
        ) : status === 'ended' ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="glass rounded-3xl p-12 text-center max-w-lg" style={{ animation: 'slideUp 0.5s ease-out' }}>
              <div className="text-6xl mb-4">📹</div>
              <h2 className="text-2xl font-bold text-white mb-2">Call Ended</h2>
              <p className="text-slate-400 mb-2">Duration: {formatDuration(callDuration)}</p>
              <button onClick={goBack} className="mt-6 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all">
                ← Back to {isConsultant ? 'Dashboard' : 'Officers'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Remote video (full area) */}
            <div className="video-container w-full h-full min-h-[400px] md:min-h-[500px] rounded-3xl overflow-hidden bg-slate-800/50 border border-slate-700/50">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {status === 'waiting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-4xl mb-6 shadow-2xl shadow-emerald-500/30" style={{ animation: 'pulse-glow 2s infinite' }}>
                    {isConsultant ? '👤' : '👨‍🌾'}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Waiting for {isConsultant ? 'farmer' : 'consultant'} to join...
                  </h3>
                  <p className="text-slate-400 text-sm">The call will start automatically when they connect</p>
                  <div className="mt-6 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'pulse-glow 1s infinite' }}></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'pulse-glow 1s infinite 0.3s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'pulse-glow 1s infinite 0.6s' }}></div>
                  </div>
                </div>
              )}

              {/* Local video (PIP) */}
              <div className="video-pip">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {isVideoOff && (
                  <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                    <span className="text-3xl">🙈</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls Bar */}
      {status !== 'ended' && !error && (
        <div className="px-6 py-5 flex items-center justify-center gap-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800/50" style={{ animation: 'slideUp 0.4s ease-out' }}>
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 ${
              isMuted
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-800 border border-slate-600 text-white hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎙️'}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 ${
              isVideoOff
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-800 border border-slate-600 text-white hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? '📷' : '📹'}
          </button>

          <button
            onClick={endCall}
            className="w-16 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95"
            title="End Call"
          >
            📞
          </button>
        </div>
      )}
    </div>
  );
}
