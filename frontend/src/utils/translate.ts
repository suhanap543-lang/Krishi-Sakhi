
import { apiFetch } from './api';

let currentLanguage = localStorage.getItem('ammachi_language') || 'English';

export const SUPPORTED_LANGUAGES = [
  'English',
  'Hindi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Odia',
  'Punjabi',
  'Assamese',
  'Bodo',
  'Dogri',
  'Kashmiri',
  'Konkani',
  'Maithili',
  'Manipuri',
  'Nepali',
  'Sanskrit',
  'Santali',
  'Sindhi',
  'Urdu'
];

// Dictionary of translations
const translations = {
  // Common UI elements
  'Language': {
    'English': 'Language',
    'Malayalam': 'ഭാഷ',
    'Hindi': 'भाषा',
    'Bengali': 'ভাষা',
    'Tamil': 'மொழி',
    'Telugu': 'భాష',
    'Marathi': 'भाषा',
    'Gujarati': 'ഭാഷ', // utilizing Malayalam for now as placeholder or need actual Gujarati: ભાષા
    'Kannada': 'ಭಾಷೆ',
    'Odia': 'ଭାଷା',
    'Punjabi': 'ਭਾਸ਼ਾ'
  },
  'Save': {
    'English': 'Save',
    'Malayalam': 'സേവ് ചെയ്യുക'
  },
  'Cancel': {
    'English': 'Cancel',
    'Malayalam': 'റദ്ദാക്കുക'
  },
  'Edit': {
    'English': 'Edit',
    'Malayalam': 'എഡിറ്റ് ചെയ്യുക'
  },
  'Profile': {
    'English': 'Profile',
    'Malayalam': 'പ്രൊഫൈൽ'
  },
  'Dashboard': {
    'English': 'Dashboard',
    'Malayalam': 'ഡാഷ്ബോർഡ്'
  },
  'Logout': {
    'English': 'Logout',
    'Malayalam': 'ലോഗ്ഔട്ട്'
  },
  'Loading profile...': {
    'English': 'Loading profile...',
    'Malayalam': 'പ്രൊഫൈൽ ലോഡ് ചെയ്യുന്നു...'
  },
  'Farmer': {
    'English': 'Farmer',
    'Malayalam': 'കർഷകൻ'
  },
  'Submit': {
    'English': 'Submit',
    'Malayalam': 'സമർപ്പിക്കുക'
  },
  'Save Changes': {
    'English': 'Save Changes',
    'Malayalam': 'മാറ്റങ്ങൾ സംരക്ഷിക്കുക'
  },
  
  // Profile page
  'Phone Number': {
    'English': 'Phone Number',
    'Malayalam': 'ഫോൺ നമ്പർ'
  },
  'Experience (years)': {
    'English': 'Experience (years)',
    'Malayalam': 'പരിചയം (വർഷങ്ങൾ)'
  },
  'Email': {
    'English': 'Email',
    'Malayalam': 'ഇമെയിൽ'
  },
  'District': {
    'English': 'District',
    'Malayalam': 'ജില്ല'
  },
  'Farms': {
    'English': 'Farms',
    'Malayalam': 'ഫാമുകൾ'
  },
  'Questions Asked': {
    'English': 'Questions Asked',
    'Malayalam': 'ചോദിച്ച ചോദ്യങ്ങൾ'
  },
  'Days Active': {
    'English': 'Days Active',
    'Malayalam': 'സജീവ ദിവസങ്ങൾ'
  },
  'Add Farm': {
    'English': 'Add Farm',
    'Malayalam': 'ഫാം ചേർക്കുക'
  },
  'Farm': {
    'English': 'Farm',
    'Malayalam': 'ഫാം'
  },
  'Farm Name': {
    'English': 'Farm Name',
    'Malayalam': 'ഫാമിന്റെ പേര്'
  },
  'Acres': {
    'English': 'Acres',
    'Malayalam': 'ഏക്കർ'
  },
  'Location': {
    'English': 'Location',
    'Malayalam': 'സ്ഥലം'
  },
  'Crops (comma separated)': {
    'English': 'Crops (comma separated)',
    'Malayalam': 'വിളകൾ (കോമ വേർതിരിച്ചത്)'
  },
  'App Settings': {
    'English': 'App Settings',
    'Malayalam': 'ആപ്പ് സെറ്റിംഗ്സ്'
  },
  'Choose your preferred language': {
    'English': 'Choose your preferred language',
    'Malayalam': 'നിങ്ങളുടെ ഇഷ്ടമുള്ള ഭാഷ തിരഞ്ഞെടുക്കുക'
  },
  'Your Activity': {
    'English': 'Your Activity',
    'Malayalam': 'നിങ്ങളുടെ പ്രവർത്തനം'
  },
  'Crops Scanned': {
    'English': 'Crops Scanned',
    'Malayalam': 'സ്കാൻ ചെയ്ത വിളകൾ'
  },

  'Select': {
    'English': 'Select',
    'Malayalam': 'തിരഞ്ഞെടുക്കുക'
  },
  'Full Name': {
    'English': 'Full Name',
    'Malayalam': 'മുഴുവൻ പേര്'
  },
  'Number of farms': {
    'English': 'Number of farms',
    'Malayalam': 'ഫാമുകളുടെ എണ്ണം'
  },
  'State': {
    'English': 'State',
    'Malayalam': 'സംസ്ഥാനം'
  },
  'Personal Information': {
    'English': 'Personal Information',
    'Malayalam': 'വ്യക്തിഗത വിവരങ്ങൾ'
  },
  'No farms added.': {
    'English': 'No farms added.',
    'Malayalam': 'ഫാമുകളൊന്നും ചേർത്തിട്ടില്ല.'
  },
  'Remove': {
    'English': 'Remove',
    'Malayalam': 'നീക്കം ചെയ്യുക'
  },
  'Loading weather data for': {
    'English': 'Loading weather data for',
    'Malayalam': 'കാലാവസ്ഥ വിവരങ്ങൾ ലോഡ് ചെയ്യുന്നു'
  },
  'Error': {
    'English': 'Error',
    'Malayalam': 'പിശക്'
  },
  'Please ensure': {
    'English': 'Please ensure',
    'Malayalam': 'ദയവായി ഉറപ്പാക്കുക'
  },
  'Backend server is running at': {
    'English': 'Backend server is running at',
    'Malayalam': 'ബാക്കെൻഡ് സെർവർ പ്രവർത്തിക്കുന്നത്'
  },
  'is properly set in the backend .env file': {
    'English': 'is properly set in the backend .env file',
    'Malayalam': 'ബാക്കെൻഡ് .env ഫയലിൽ ശരിയായി സജ്ജീകരിച്ചിരിക്കുന്നു'
  },
  'Your internet connection is working': {
    'English': 'Your internet connection is working',
    'Malayalam': 'നിങ്ങളുടെ ഇന്റർനെറ്റ് കണക്ഷൻ പ്രവർത്തിക്കുന്നു'
  },
  'Retry': {
    'English': 'Retry',
    'Malayalam': 'വീണ്ടും ശ്രമിക്കുക'
  },
  'Current Weather': {
    'English': 'Current Weather',
    'Malayalam': 'ഇപ്പോഴത്തെ കാലാവസ്ഥ'
  },
  'Feels like': {
    'English': 'Feels like',
    'Malayalam': 'അനുഭവപ്പെടുന്നത്'
  },
  'Humidity': {
    'English': 'Humidity',
    'Malayalam': 'ആർദ്രത'
  },
  'Wind Speed': {
    'English': 'Wind Speed',
    'Malayalam': 'കാറ്റിന്റെ വേഗത'
  },
  'Pressure': {
    'English': 'Pressure',
    'Malayalam': 'മർദ്ദം'
  },
  'Visibility': {
    'English': 'Visibility',
    'Malayalam': 'ദൃശ്യത'
  },
  'Rain Chance': {
    'English': 'Rain Chance',
    'Malayalam': 'മഴ സാധ്യത'
  },
  'Updated': {
    'English': 'Updated',
    'Malayalam': 'അപ്ഡേറ്റ് ചെയ്തത്'
  },
  'Farming Advisories': {
    'English': 'Farming Advisories',
    'Malayalam': 'കൃഷി ഉപദേശങ്ങൾ'
  },
  'Watering Advisory': {
    'English': 'Watering Advisory',
    'Malayalam': 'ജലസേചന ഉപദേശം'
  },
  'Reduce watering today due to high humidity': {
    'English': 'Reduce watering today due to high humidity',
    'Malayalam': 'ഉയർന്ന ആർദ്രത കാരണം ഇന്ന് ജലസേചനം കുറയ്ക്കുക'
  },
  'Rain expected tomorrow': {
    'English': 'Rain expected tomorrow',
    'Malayalam': 'നാളെ മഴ പ്രതീക്ഷിക്കുന്നു'
  },
  'Current humidity is': {
    'English': 'Current humidity is',
    'Malayalam': 'നിലവിലെ ആർദ്രത'
  },
  'Regular watering recommended': {
    'English': 'Regular watering recommended',
    'Malayalam': 'സാധാരണ ജലസേചനം ശുപാർശ ചെയ്യുന്നു'
  },
  'Pest Alert': {
    'English': 'Pest Alert',
    'Malayalam': 'കീട അലേർട്ട്'
  },
  'High humidity may increase fungal diseases. Monitor crops closely': {
    'English': 'High humidity may increase fungal diseases. Monitor crops closely',
    'Malayalam': 'ഉയർന്ന ആർദ്രത കൂണ് രോഗങ്ങൾ വർദ്ധിപ്പിച്ചേക്കാം. വിളകൾ സൂക്ഷ്മമായി നിരീക്ഷിക്കുക'
  },
  'Harvesting Window': {
    'English': 'Harvesting Window',
    'Malayalam': 'വിളവെടുപ്പ് സമയം'
  },
  'Good weather conditions for harvesting in the next few days': {
    'English': 'Good weather conditions for harvesting in the next few days',
    'Malayalam': 'അടുത്ത കുറച്ച് ദിവസങ്ങളിൽ വിളവെടുപ്പിന് നല്ല കാലാവസ്ഥ'
  },
  '7-Day Forecast': {
    'English': '7-Day Forecast',
    'Malayalam': '7-ദിവസ പ്രവചനം'
  },
  'Hourly Forecast': {
    'English': 'Hourly Forecast',
    'Malayalam': 'മണിക്കൂർ പ്രവചനം'
  },
  'Disease Detection': {
    'English': 'Disease Detection',
    'Malayalam': 'രോഗ നിർണ്ണയം'
  },
  'Upload a photo of your crop to detect diseases': {
    'English': 'Upload a photo of your crop to detect diseases',
    'Malayalam': 'രോഗങ്ങൾ കണ്ടെത്താൻ നിങ്ങളുടെ വിളയുടെ ഒരു ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക'
  },
  'Upload Crop Photo': {
    'English': 'Upload Crop Photo',
    'Malayalam': 'വിള ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക'
  },
  'Drag and drop your image here, or click to browse': {
    'English': 'Drag and drop your image here, or click to browse',
    'Malayalam': 'നിങ്ങളുടെ ചിത്രം ഇവിടെ വലിച്ചിടുക, അല്ലെങ്കിൽ ബ്രൗസ് ചെയ്യാൻ ക്ലിക്ക് ചെയ്യുക'
  },
  'Please upload a valid image file (JPG, PNG)': {
    'English': 'Please upload a valid image file (JPG, PNG)',
    'Malayalam': 'ദയവായി സാധുവായ ഇമേജ് ഫയൽ അപ്‌ലോഡ് ചെയ്യുക (JPG, PNG)'
  },
  'File size must be less than 5MB': {
    'English': 'File size must be less than 5MB',
    'Malayalam': 'ഫയൽ വലുപ്പം 5MB-ൽ കുറവായിരിക്കണം'
  },
  'Detection failed': {
    'English': 'Detection failed',
    'Malayalam': 'കണ്ടെത്തൽ പരാജയപ്പെട്ടു'
  },
  'No description available': {
    'English': 'No description available',
    'Malayalam': 'വിവരണം ലഭ്യമല്ല'
  },
  'Your crop appears to be healthy! No diseases detected.': {
    'English': 'Your crop appears to be healthy! No diseases detected.',
    'Malayalam': 'നിങ്ങളുടെ വിള ആരോഗ്യകരമാണെന്ന് തോന്നുന്നു! രോഗങ്ങളൊന്നും കണ്ടെത്തിയില്ല.'
  },
  'No diseases detected. Your crop appears to be healthy!': {
    'English': 'No diseases detected. Your crop appears to be healthy!',
    'Malayalam': 'രോഗങ്ങളൊന്നും കണ്ടെത്തിയില്ല. നിങ്ങളുടെ വിള ആരോഗ്യകരമാണെന്ന് തോന്നുന്നു!'
  },
  'Failed to analyze the image. Please try again with a clearer photo.': {
    'English': 'Failed to analyze the image. Please try again with a clearer photo.',
    'Malayalam': 'ചിത്രം വിശകലനം ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു. കൂടുതൽ വ്യക്തതയുള്ള ഫോട്ടോയുമായി വീണ്ടും ശ്രമിക്കുക.'
  },
  'No specific remedies found. Please consult with an agricultural expert.': {
    'English': 'No specific remedies found. Please consult with an agricultural expert.',
    'Malayalam': 'പ്രത്യേക പരിഹാരങ്ങളൊന്നും കണ്ടെത്തിയില്ല. ദയവായി ഒരു കാർഷിക വിദഗ്ധനെ സമീപിക്കുക.'
  },
  'Unable to fetch remedies at the moment. Please consult with an agricultural expert.': {
    'English': 'Unable to fetch remedies at the moment. Please consult with an agricultural expert.',
    'Malayalam': 'ഇപ്പോൾ പരിഹാരങ്ങൾ ലഭ്യമാക്കാൻ കഴിയില്ല. ദയവായി ഒരു കാർഷിക വിദഗ്ധനെ സമീപിക്കുക.'
  },
  'Your Farming Assistant': {
    'English': 'Your Farming Assistant',
    'Malayalam': 'നിങ്ങളുടെ കാർഷിക സഹായി'
  },
  'of': {
    'English': 'of',
    'Malayalam': 'ൽ നിന്ന്'
  },
  'recent scans show healthy crops': {
    'English': 'recent scans show healthy crops',
    'Malayalam': 'സമീപകാല സ്കാനുകൾ ആരോഗ്യകരമായ വിളകൾ കാണിക്കുന്നു'
  },
  'Your crops are looking healthy today': {
    'English': 'Your crops are looking healthy today',
    'Malayalam': 'നിങ്ങളുടെ വിളകൾ ഇന്ന് ആരോഗ്യകരമായി കാണപ്പെടുന്നു'
  },
  'Last updated': {
    'English': 'Last updated',
    'Malayalam': 'അവസാനം അപ്ഡേറ്റ് ചെയ്തത്'
  },
  'Refresh': {
    'English': 'Refresh',
    'Malayalam': 'പുതുക്കുക'
  },
  'Scan Leaf': {
    'English': 'Scan Leaf',
    'Malayalam': 'ഇല സ്കാൻ ചെയ്യുക'
  },
  'Ask AI': {
    'English': 'Ask AI',
    'Malayalam': 'AI-യോട് ചോദിക്കുക'
  },
  'Crop Health': {
    'English': 'Crop Health',
    'Malayalam': 'വിള ആരോഗ്യം'
  },
  'Today\'s Tips': {
    'English': 'Today\'s Tips',
    'Malayalam': 'ഇന്നത്തെ നുറുങ്ങുകൾ'
  },
  'Today\'s Weather': {
    'English': 'Today\'s Weather',
    'Malayalam': 'ഇന്നത്തെ കാലാവസ്ഥ'
  },
  'View Details': {
    'English': 'View Details',
    'Malayalam': 'വിശദാംശങ്ങൾ കാണുക'
  },
  'Wind': {
    'English': 'Wind',
    'Malayalam': 'കാറ്റ്'
  },
  'Market Prices': {
    'English': 'Market Prices',
    'Malayalam': 'വിപണി വിലകൾ'
  },
  'Live crop prices and market trends for better selling decisions': {
    'English': 'Live crop prices and market trends for better selling decisions',
    'Malayalam': 'മികച്ച വിൽപ്പന തീരുമാനങ്ങൾക്കായി തത്സമയ വിള വിലകളും വിപണി പ്രവണതകളും'
  },
  'Select District': {
    'English': 'Select District',
    'Malayalam': 'ജില്ല തിരഞ്ഞെടുക്കുക'
  },
  'Select Market': {
    'English': 'Select Market',
    'Malayalam': 'വിപണി തിരഞ്ഞെടുക്കുക'
  },
  'No markets found': {
    'English': 'No markets found',
    'Malayalam': 'വിപണികളൊന്നും കണ്ടെത്തിയില്ല'
  },
  'markets available': {
    'English': 'markets available',
    'Malayalam': 'വിപണികൾ ലഭ്യമാണ്'
  },
  'Select Crop': {
    'English': 'Select Crop',
    'Malayalam': 'വിള തിരഞ്ഞെടുക്കുക'
  },
  'Last Updated': {
    'English': 'Last Updated',
    'Malayalam': 'അവസാനം പുതുക്കിയത്'
  },
  'Loading market data...': {
    'English': 'Loading market data...',
    'Malayalam': 'വിപണി ഡാറ്റ ലോഡ് ചെയ്യുന്നു...'
  },
  'Minimum Price': {
    'English': 'Minimum Price',
    'Malayalam': 'കുറഞ്ഞ വില'
  },
  'Lowest recorded price for': {
    'English': 'Lowest recorded price for',
    'Malayalam': 'ഏറ്റവും കുറഞ്ഞ രേഖപ്പെടുത്തിയ വില'
  },
  'in': {
    'English': 'in',
    'Malayalam': 'ൽ'
  },
  'Modal Price': {
    'English': 'Modal Price',
    'Malayalam': 'സാധാരണ വില'
  },
  'Most common price for': {
    'English': 'Most common price for',
    'Malayalam': 'ഏറ്റവും സാധാരണമായ വില'
  },
  'Maximum Price': {
    'English': 'Maximum Price',
    'Malayalam': 'പരമാവധി വില'
  },
  'Highest recorded price for': {
    'English': 'Highest recorded price for',
    'Malayalam': 'ഏറ്റവും ഉയർന്ന രേഖപ്പെടുത്തിയ വില'
  },
  'Quality': {
    'English': 'Quality',
    'Malayalam': 'ഗുണനിലവാരം'
  },
  'Market': {
    'English': 'Market',
    'Malayalam': 'വിപണി'
  },
  'Market Summary': {
    'English': 'Market Summary',
    'Malayalam': 'വിപണി സംഗ്രഹം'
  },
  'Selected Market': {
    'English': 'Selected Market',
    'Malayalam': 'തിരഞ്ഞെടുത്ത വിപണി'
  },
  'Data Points': {
    'English': 'Data Points',
    'Malayalam': 'ഡാറ്റ പോയിന്റുകൾ'
  },
    'Average Price': {
    'English': 'Average Price',
    'Malayalam': 'ശരാശരി വില',
    'Hindi': 'औसत मूल्य',
    'Bengali': 'গড় দাম',
    'Tamil': 'சராசரி விலை',
    'Telugu': 'సగటు ధర',
    'Marathi': 'सरासरी किंमत',
    'Gujarati': 'સરેરાશ કિંમત',
    'Kannada': 'ಸರಾಸರಿ ಬೆಲೆ',
    'Odia': 'ହାରାହାରି ମୂଲ୍ୟ',
    'Punjabi': 'ਔਸਤ ਕੀਮਤ'
  },
  
  // Sidebar Items
  'Reminders': {
    'English': 'Reminders',
    'Malayalam': 'ഓർമ്മപ്പെടുത്തലുകൾ',
    'Hindi': 'अनुस्मारक',
    'Bengali': 'অনুস্মারক',
    'Tamil': 'நினைவூட்டல்கள்',
    'Telugu': 'రిమైండర్లు',
    'Marathi': 'आठवणी',
    'Gujarati': 'રીમાઇન્ડર્સ',
    'Kannada': 'ಜ್ಞಾಪನೆಗಳು',
    'Odia': 'ସ୍ମାରକପତ୍ର',
    'Punjabi': 'ਯਾਦ-ਦਹਾਨੀਆਂ'
  },
  'Officers': {
    'English': 'Officers',
    'Malayalam': 'ഉദ്യോഗസ്ഥർ',
    'Hindi': 'अधिकारी',
    'Bengali': 'কর্মকর্তারা',
    'Tamil': 'அதிகாரிகள்',
    'Telugu': 'అధికారులు',
    'Marathi': 'अधिकारी',
    'Gujarati': 'અધિકારીઓ',
    'Kannada': 'ಅಧಿಕಾರಿಗಳು',
    'Odia': 'ଅଧିକାରୀମାନେ',
    'Punjabi': 'ਅਫਸਰ'
  },
  'Chat': {
    'English': 'Chat',
    'Malayalam': 'ചാറ്റ്',
    'Hindi': 'चैट',
    'Bengali': 'চ্যাট',
    'Tamil': 'அரட்டை',
    'Telugu': 'చాట్',
    'Marathi': 'गप्पा',
    'Gujarati': 'ચેટ',
    'Kannada': 'ಚಾಟ್',
    'Odia': 'ଚାଟ୍',
    'Punjabi': 'ਗੱਲਬਾਤ'
  },
  'Detect': {
    'English': 'Detect',
    'Malayalam': 'കണ്ടെത്തുക',
    'Hindi': 'पता लगाएं',
    'Bengali': 'সনাক্ত করুন',
    'Tamil': 'கண்டறி',
    'Telugu': 'గుర్తించండి',
    'Marathi': 'ओळखा',
    'Gujarati': 'શોધો',
    'Kannada': 'ಪತ್ತೆ ಮಾಡಿ',
    'Odia': 'ଚିହ୍ନଟ କରନ୍ତୁ',
    'Punjabi': 'ਪਤਾ ਲਗਾਓ'
  },
  'Weather': {
    'English': 'Weather',
    'Malayalam': 'കാലാവസ്ഥ',
    'Hindi': 'मौसम',
    'Bengali': 'আবহাওয়া',
    'Tamil': 'வானிலை',
    'Telugu': 'వాతావరణం',
    'Marathi': 'हवामान',
    'Gujarati': 'હવામાન',
    'Kannada': 'ಹವಾಮಾನ',
    'Odia': 'ପାଣିପାଗ',
    'Punjabi': 'ਮੌਸମ'
  },
  'Smart Recs': {
    'English': 'Smart Recs',
    'Malayalam': 'ശുപാർശകൾ',
    'Hindi': 'सिफारिशें',
    'Bengali': 'সুপারিশ',
    'Tamil': 'பரிந்துரைகள்',
    'Telugu': 'సిఫార్సులు',
    'Marathi': 'शिफारसी',
    'Gujarati': 'ભલામણો',
    'Kannada': 'ಶಿಫಾರಸುಗಳು',
    'Odia': 'ସୁପାରିଶ',
    'Punjabi': 'ਸਿਫਾਰਸ਼ਾਂ'
  },
  'Feedback': {
    'English': 'Feedback',
    'Malayalam': 'അഭിപ്രായം',
    'Hindi': 'प्रतिक्रिया',
    'Bengali': 'প্রতিক্রিয়া',
    'Tamil': 'கருத்து',
    'Telugu': 'అభిప్రాయం',
    'Marathi': 'प्रतिक्रिया',
    'Gujarati': 'પ્રતિસાદ',
    'Kannada': 'ಪ್ರತಿಕ್ರಿಯೆ',
    'Odia': 'ମତାମତ',
    'Punjabi': 'ਫੀਡਬੈਕ'
  },
  'Your Farming Companion': {
    'English': 'Your Farming Companion',
    'Malayalam': 'നിങ്ങളുടെ കാർഷിക കൂട്ടുകാരൻ',
    'Hindi': 'आपका खेती साथी',
    'Bengali': 'আপনার কৃষি বন্ধু',
    'Tamil': 'உங்கள் விவசாயத் தோழன்',
    'Telugu': 'మీ వ్యవసాయ సహచరుడు',
    'Marathi': 'तुमचा शेती सोबती',
    'Gujarati': 'તમારા ખેતી સાથી',
    'Kannada': 'ನಿಮ್ಮ ಕೃಷಿ ಸಂಗಾತಿ',
    'Odia': 'ଆପଣଙ୍କର କୃଷି ସାଥୀ',
    'Punjabi': 'ਤੁਹਾਡਾ ਖੇਤੀ ਸਾਥੀ'
  },

  // Chat UI
  'Your Digital Farming Companion': {
    'English': 'Your Digital Farming Companion',
    'Malayalam': 'നിങ്ങളുടെ ഡിജിറ്റൽ കാർഷിക സഹായി',
    'Hindi': 'आपका डिजिटल कृषि साथी',
    'Bengali': 'আপনার ডিজিটাল কৃষি বন্ধু',
    'Tamil': 'உங்கள் டிஜிட்டல் விவசாயத் தோழன்',
    'Telugu': 'మీ డిజిటల్ వ్యవసాయ సహచరుడు',
    'Marathi': 'तुमचा डिजिटल शेती सोबती',
    'Gujarati': 'તમારા ડિજિટલ ખેતી સાથી',
    'Kannada': 'ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಕೃಷಿ ಸಂಗಾತಿ',
    'Odia': 'ଆପଣଙ୍କର ଡିଜିଟାଲ୍ କୃଷି ସାଥୀ',
    'Punjabi': 'ਤੁਹਾਡਾ ਡਿਜੀଟਲ ਖੇਤੀ ਸਾਥੀ'
  },
  'Ask your farming question...': {
    'English': 'Ask your farming question...',
    'Malayalam': 'നിങ്ങളുടെ കാർഷിക ചോദ്യം ചോദിക്കുക...',
    'Hindi': 'अपना खेती का सवाल पूछें...',
    'Bengali': 'আপনার কৃষির প্রশ্ন জিজ্ঞাসা করুন...',
    'Tamil': 'உங்கள் விவசாயக் கேள்வியைக் கேளுங்கள்...',
    'Telugu': 'మీ వ్యవసాయ ప్రశ్నను అడగండి...',
    'Marathi': 'आपला शेतीचा प्रश्न विचारा...',
    'Gujarati': 'તમારા ખેતીનો પ્રશ્ન પૂછો...',
    'Kannada': 'ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ...',
    'Odia': 'ଆପଣଙ୍କର କୃଷି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ...',
    'Punjabi': 'ਆਪਣਾ ਖੇਤੀ ਦਾ ਸਵਾਲ ਪੁੱਛੋ...'
  },
  'Stop listening': {
    'English': 'Stop listening',
    'Malayalam': 'ശ്രദ്ധിക്കുന്നത് നിർത്തുക',
    'Hindi': 'सुनना बंद करें',
    'Bengali': 'শোনা বন্ধ করুন',
    'Tamil': 'கேட்பதை நிறுத்து',
    'Telugu': 'వినడం ఆపండి',
    'Marathi': 'ऐकणे थांबवा',
    'Gujarati': 'સાંભળવાનું બંધ કરો',
    'Kannada': 'ಕೇಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ',
    'Odia': 'ଶୁଣିବା ବନ୍ଦ କରନ୍ତୁ',
    'Punjabi': 'ਸੁਣਨਾ ਬੰਦ ਕਰੋ'
  },
  'Start voice input': {
    'English': 'Start voice input',
    'Malayalam': 'ശബ്ദ ഇൻപുട്ട് ആരംഭിക്കുക',
    'Hindi': 'वॉयस ഇൻപുട്ട് શરૂ करें',
    'Bengali': 'ভয়েস ইনপুট শুরু করুন',
    'Tamil': 'குரல் உள்ளீட்டைத் தொடங்கவும்',
    'Telugu': 'వాయిస్ ఇన్‌పుట్ ప్రారంభించండి',
    'Marathi': 'व्हॉइस इनपुट सुरू करा',
    'Gujarati': 'વોઇસ ઇનપુટ શરૂ કરો',
    'Kannada': 'ಧ್ವನಿ ಇನ್ಪುಟ್ ಪ್ರಾರಂಭಿಸಿ',
    'Odia': 'ଭଏସ୍ ଇନପୁଟ୍ ଆରମ୍ଭ କରନ୍ତୁ',
    'Punjabi': 'ਆਵਾਜ਼ ਇਨਪੁਟ ਸ਼ੁਰੂ ਕਰੋ'
  },
  'Activities': {
    'English': 'Activities',
    'Malayalam': 'പ്രവർത്തനങ്ങൾ',
    'Hindi': 'गतिविधियां',
    'Bengali': 'কার্যকলাপ',
    'Tamil': 'செயல்பாடுகள்',
    'Telugu': 'కార్యకలాపాలు',
    'Marathi': 'उपक्रम',
    'Gujarati': 'પ્રવૃત્તિઓ',
    'Kannada': 'ಚಟುವಟಿಕೆಗಳು',
    'Odia': 'କାର୍ଯ୍ୟକଳାପ',
    'Punjabi': 'ਗਤੀਵਿਧੀਆਂ'
  }
};

/**
 * Translates a text based on the current language setting
 * @param {string} text - The text to translate
 * @returns {string} - The translated text
 */
export function translate(text) {
  // If the text doesn't exist in our dictionary, return the original text
  if (!translations[text]) {
    return text;
  }
  
  // Return the translation for the current language, or the original text if translation not found
  return translations[text][currentLanguage] || text;
}

/**
 * Sets the current language for the application
 * @param {string} language - The language to set ('English' or 'Malayalam')
 */
export function setLanguage(language) {
  if (SUPPORTED_LANGUAGES.includes(language)) {
    currentLanguage = language;
    localStorage.setItem('ammachi_language', language);
  }
}

/**
 * Gets the current language setting
 * @returns {string} - The current language ('English' or 'Malayalam')
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Translates text using the backend API for more complex translations
 * @param {string} text - The text to translate
 * @param {string} targetLanguage - The target language ('English' or 'Malayalam')
 * @returns {Promise<string>} - A promise that resolves to the translated text
 */


export async function translateWithAPI(text, targetLanguage) {
  try {
    const response = await apiFetch('/api/sarvam/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage: SUPPORTED_LANGUAGES.includes(targetLanguage) ? targetLanguage : 'English',
      }),
    });

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('Translation API error:', error);
    return text; // Return original text if translation fails
  }
}

/**
 * Gets the BCP-47 language code for the current language
 * Used for Speech Recognition and Synthesis
 * @returns {string} - The BCP-47 language code (e.g., 'en-IN', 'ml-IN')
 */
export function getLanguageCode() {
  const codes = {
    'English': 'en-IN',
    'Hindi': 'hi-IN',
    'Bengali': 'bn-IN',
    'Tamil': 'ta-IN',
    'Telugu': 'te-IN',
    'Marathi': 'mr-IN',
    'Gujarati': 'gu-IN',
    'Kannada': 'kn-IN',
    'Malayalam': 'ml-IN',
    'Odia': 'or-IN',
    'Punjabi': 'pa-IN',
    'Assamese': 'as-IN',
    'Bodo': 'brx-IN',
    'Dogri': 'doi-IN',
    'Kashmiri': 'ks-IN',
    'Konkani': 'kok-IN',
    'Maithili': 'mai-IN',
    'Manipuri': 'mni-IN',
    'Nepali': 'ne-IN',
    'Sanskrit': 'sa-IN',
    'Santali': 'sat-IN',
    'Sindhi': 'sd-IN',
    'Urdu': 'ur-IN'
  };
  return codes[currentLanguage] || 'en-IN';
}

/**
 * Gets the Sarvam AI language code for a given language name
 * Used for Sarvam AI API calls (translate, STT)
 * @param {string} languageName - The display name of the language
 * @returns {string} - The Sarvam 2-letter language code
 */
export function getSarvamLanguageCode(languageName) {
  const codes = {
    'English': 'en',
    'Hindi': 'hi',
    'Bengali': 'bn',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Marathi': 'mr',
    'Gujarati': 'gu',
    'Kannada': 'kn',
    'Malayalam': 'ml',
    'Odia': 'or',
    'Punjabi': 'pa',
    'Assamese': 'as',
    'Bodo': 'brx',
    'Dogri': 'doi',
    'Kashmiri': 'ks',
    'Konkani': 'gom',
    'Maithili': 'mai',
    'Manipuri': 'mni',
    'Nepali': 'ne',
    'Sanskrit': 'sa',
    'Santali': 'sat',
    'Sindhi': 'sd',
    'Urdu': 'ur'
  };
  return codes[languageName] || 'en';
}