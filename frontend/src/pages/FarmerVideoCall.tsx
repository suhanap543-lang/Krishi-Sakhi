import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Sidebar from '../components/Sidebar';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function FarmerVideoCall() {
  // Parse params from hash
  const params = (() => {
    const h = window.location.hash;
    const qIndex = h.indexOf('?');
    if (qIndex === -1) return {};
    return Object.fromEntries(new URLSearchParams(h.substring(qIndex)).entries());
  })();

  const roomId = params.room || '';
  const consultationId = params.cid || '';

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

  const startCall = useCallback(async () => {
    if (!roomId) {
      setError('No room ID provided. Please go back and try again.');
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
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        setStatus('waiting');
        socket.emit('join-room', roomId, 'farmer');
      });

      socket.on('room-users', (users: string[]) => {
        if (users.length > 0) {
          createPeerConnection(socket, users[0]);
          makeOffer(users[0]);
        }
      });

      socket.on('user-joined', ({ socketId }: { socketId: string }) => {
        // New user joined - they will send us an offer or we need to create one
      });

      socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
        if (!pcRef.current) createPeerConnection(socket, from);
        await pcRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
        while (iceCandidateQueue.current.length > 0) {
          const c = iceCandidateQueue.current.shift();
          if (c) pcRef.current!.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
        }
        const answer = await pcRef.current!.createAnswer();
        await pcRef.current!.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer, to: from });
      });

      socket.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          while (iceCandidateQueue.current.length > 0) {
            const c = iceCandidateQueue.current.shift();
            if (c) pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
          }
        }
      });

      socket.on('ice-candidate', ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (pcRef.current && candidate) {
          if (pcRef.current.remoteDescription) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          } else {
            iceCandidateQueue.current.push(candidate);
          }
        }
      });

      socket.on('user-left', () => {
        setStatus('ended');
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        clearInterval(timerRef.current);
      });

      socket.on('connect_error', () => setError('Failed to connect to signaling server'));

    } catch (err: any) {
      if (err.name === 'NotAllowedError') setError('Camera/microphone permission denied.');
      else if (err.name === 'NotFoundError') setError('No camera or microphone found.');
      else setError(`Failed to start call: ${err.message}`);
    }
  }, [roomId]);

  const createPeerConnection = (socket: Socket, remoteSocketId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setStatus('connected');
        timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit('ice-candidate', { roomId, candidate: event.candidate.toJSON(), to: remoteSocketId });
    };

    pc.oniceconnectionstatechange = () => {
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
    socketRef.current?.emit('offer', { roomId, offer, to: remoteSocketId });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = () => {
    if (socketRef.current && roomId) { socketRef.current.emit('leave-room', roomId); socketRef.current.disconnect(); }
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    clearInterval(timerRef.current);
    setStatus('ended');
  };

  const goBack = () => { endCall(); window.location.hash = '#/officers'; };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isStarted.current) return;
    isStarted.current = true;
    startCall();
    return () => { endCall(); isStarted.current = false; };
  }, []);

  return (
    <div className="flex bg-gray-900 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 flex flex-col">
        {/* Top Bar */}
        <div className="px-6 py-4 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-10 h-10 rounded-xl bg-gray-700 border border-gray-600 flex items-center justify-center text-white hover:bg-gray-600 transition-all">←</button>
            <div>
              <h1 className="text-lg font-extrabold text-white flex items-center gap-2">📹 Video Consultation</h1>
              <p className="text-xs text-gray-400">Room: {roomId || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status === 'connected' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/60 border border-emerald-700 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-300 text-sm font-bold">LIVE</span>
                <span className="text-emerald-400 text-sm font-mono">{formatDuration(callDuration)}</span>
              </div>
            )}
            {status === 'waiting' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/60 border border-amber-700 rounded-xl">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-amber-300 text-sm font-bold">Waiting for consultant...</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative p-4 md:p-8">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-gray-800 rounded-3xl p-12 text-center max-w-lg border border-gray-700">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <button onClick={goBack} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all">← Go Back</button>
              </div>
            </div>
          ) : status === 'ended' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-gray-800 rounded-3xl p-12 text-center max-w-lg border border-gray-700" style={{ animation: 'slideUp 0.5s ease-out' }}>
                <div className="text-6xl mb-4">📹</div>
                <h2 className="text-2xl font-bold text-white mb-2">Call Ended</h2>
                <p className="text-gray-400 mb-2">Duration: {formatDuration(callDuration)}</p>
                <button onClick={goBack} className="mt-6 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all">← Back to Officers</button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full min-h-[400px] md:min-h-[500px] rounded-3xl overflow-hidden bg-gray-800 border border-gray-700">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {status === 'waiting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-4xl mb-6 shadow-2xl animate-pulse">👨‍🌾</div>
                  <h3 className="text-xl font-bold text-white mb-2">Waiting for consultant to join...</h3>
                  <p className="text-gray-400 text-sm">The call will start automatically when they connect</p>
                </div>
              )}
              {/* PIP */}
              <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {isVideoOff && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center"><span className="text-3xl">🙈</span></div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {status !== 'ended' && !error && (
          <div className="px-6 py-5 flex items-center justify-center gap-4 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700">
            <button onClick={toggleMute} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 ${isMuted ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-gray-700 border border-gray-600 text-white hover:bg-gray-600'}`} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? '🔇' : '🎙️'}
            </button>
            <button onClick={toggleVideo} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 ${isVideoOff ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-gray-700 border border-gray-600 text-white hover:bg-gray-600'}`} title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
              {isVideoOff ? '📷' : '📹'}
            </button>
            <button onClick={endCall} className="w-16 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95" title="End Call">
              📞
            </button>
          </div>
        )}

        <style>{`
          @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </main>
    </div>
  );
}
