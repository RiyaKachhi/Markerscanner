export type Language = 'en' | 'hi';

export const translations = {
  en: {
    appTitle: 'LabLens',
    appSubtitle: 'AR Guide for Every Lab Instrument',
    tagline: 'Think Big. Innovate Bigger.',
    scanEquipment: 'Scan Equipment',
    browseLibrary: 'Browse Equipment Library',
    demoMode: 'Demo Mode (Simulated)',
    printMarkers: 'Print Markers',
    modelReport: 'Model Report',
    adminPanel: 'Instructor Admin',
    online: 'Online',
    offline: 'Offline (PWA Ready)',
    
    // Scan Screen
    pointCamera: 'Point camera at equipment or ArUco marker',
    scanning: 'Scanning environment...',
    locking: 'Stabilizing track...',
    locked: 'Locked on Instrument',
    freezeFrame: 'Freeze Frame',
    unfreezeFrame: 'Resume Live',
    switchCamera: 'Flip Camera',
    torchOn: 'Flashlight On',
    torchOff: 'Flashlight Off',
    ar3dMode: '3D AR Mode',
    debugHUD: 'Anchor Debug',
    safetyFirst: 'Safety First',
    hazardHigh: 'HIGH HAZARD',
    hazardMedium: 'CAUTION',
    hazardLow: 'STANDARD',
    iUnderstand: 'I Understand & Agree',
    ppeChecklistTitle: 'Mandatory PPE Verification',
    ppeChecklistPrompt: 'Tick each required item to unlock step-by-step instructions:',
    confirmEquipmentPrompt: 'High-hazard item detected. Please verify: Is this a',
    confirmYes: 'Yes, Confirm Instrument',
    belowThresholdMsg: 'Low confidence. Try moving closer or adjusting lighting.',
    candidateSheetTitle: 'Possible Matches',
    noneOfThese: 'None of these (Manual Search)',
    
    // Tabs
    tabSpecs: 'Specifications',
    tabSteps: 'Step-by-Step Guide',
    tabSafety: 'Safety Precautions',
    tabMore: 'Mistakes & Manual',

    // Steps
    stepLabel: 'Step',
    of: 'of',
    nextStep: 'Next Step',
    prevStep: 'Previous Step',
    stepFinished: 'Guide Finished',
    targetPart: 'Target Component',
    partOffScreen: 'Target component is off-screen',
    expectedReading: 'Expected Readout',

    // Badges & Anchors
    anchorMarker: 'Marker-anchored (3D Pose)',
    anchorPart: 'Part-detected (Visual Box)',
    anchorApprox: 'Approximate (Relative)',
    staffReviewed: 'Staff-Reviewed',

    // Library
    searchPlaceholder: 'Search equipment by name, category, or alias...',
    allCategories: 'All Categories',
    specsHeader: 'Technical Specifications',
    commonMistakesHeader: 'Common Operator Mistakes',
    officialManual: 'Official Documentation & Manual',
    bookmarkAdded: 'Added to bookmarks',
    bookmarkRemoved: 'Removed from bookmarks',

    // Markers Page
    markerGuideTitle: 'ArUco Marker Sheet Generator',
    markerGuideDesc: 'Print these 4x4 markers (5cm x 5cm recommended) and attach them flat near the front panel of each instrument away from glare.',
    printSheet: 'Print A4 Marker Sheet',
    markerSizeCm: 'Marker Calibration Size (cm)',

    // Admin
    adminTitle: 'Instructor & Laboratory Admin Portal',
    addInstrument: 'Add New Instrument',
    staffReviewerName: 'Staff Reviewer Name',
    saveChanges: 'Save Changes',
    deleteInstrument: 'Delete',
    markAsReviewed: 'Sign Off / Mark as Reviewed',
  },
  hi: {
    appTitle: 'लैबलेंस (LabLens)',
    appSubtitle: 'प्रयोगशाला उपकरणों के लिए संवर्धित वास्तविकता (AR) गाइड',
    tagline: 'बड़ा सोचो। नया रचो।',
    scanEquipment: 'उपकरण स्कैन करें',
    browseLibrary: 'उपकरण पुस्तकालय देखें',
    demoMode: 'डेमो मोड (सिम्युलेटेड)',
    printMarkers: 'मार्कर प्रिंट करें',
    modelReport: 'मॉडल रिपोर्ट',
    adminPanel: 'प्रशिक्षक एडमिन',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन (PWA तैयार)',

    // Scan Screen
    pointCamera: 'कैमरे को उपकरण या ArUco मार्कर की ओर लक्षित करें',
    scanning: 'स्कैन किया जा रहा है...',
    locking: 'ट्रैकिंग स्थिर की जा रही है...',
    locked: 'उपकरण पर लॉक स्थापित',
    freezeFrame: 'फ्रेम फ्रीज करें',
    unfreezeFrame: 'लाइव पुनः चालू करें',
    switchCamera: 'कैमरा बदलें',
    torchOn: 'टॉर्च चालू',
    torchOff: 'टॉर्च बंद',
    ar3dMode: '3D AR मोड',
    debugHUD: 'एंकर डिबग',
    safetyFirst: 'सुरक्षा सर्वोपरि',
    hazardHigh: 'अत्यधिक खतरनाक',
    hazardMedium: 'सावधानी बरतें',
    hazardLow: 'सामान्य सुरक्षा',
    iUnderstand: 'मैं समझ गया / सहमत हूँ',
    ppeChecklistTitle: 'अनिवार्य पीपीई (PPE) जांच',
    ppeChecklistPrompt: 'निर्देश देखने के लिए आवश्यक सुरक्षा उपकरण चिह्नित करें:',
    confirmEquipmentPrompt: 'उच्च जोखिम वाला उपकरण पाया गया। क्या यह उपकरण है:',
    confirmYes: 'हाँ, उपकरण की पुष्टि करें',
    belowThresholdMsg: 'सटीकता कम है। कृपया उपकरण के पास जाएं या प्रकाश बेहतर करें।',
    candidateSheetTitle: 'संभावित विकल्प',
    noneOfThese: 'इनमें से कोई नहीं (खोजें)',

    // Tabs
    tabSpecs: 'विनिर्देश (Specs)',
    tabSteps: 'संचालन के चरण',
    tabSafety: 'सुरक्षा सावधानियां',
    tabMore: 'गलतियां व मैनुअल',

    // Steps
    stepLabel: 'चरण',
    of: 'का',
    nextStep: 'अगला चरण',
    prevStep: 'पिछला चरण',
    stepFinished: 'गाइड पूर्ण हुआ',
    targetPart: 'लक्षित घटक',
    partOffScreen: 'घटक स्क्रीन से बाहर है',
    expectedReading: 'अपेक्षित मान',

    // Badges & Anchors
    anchorMarker: 'मार्कर-एंकर (3D पोज़)',
    anchorPart: 'पहचाना गया घटक',
    anchorApprox: 'अनुमानित स्थिति',
    staffReviewed: 'शिक्षक द्वारा सत्यापित',

    // Library
    searchPlaceholder: 'उपकरण का नाम, श्रेणी या उपनाम खोजें...',
    allCategories: 'सभी श्रेणियां',
    specsHeader: 'तकनीकी विनिर्देश',
    commonMistakesHeader: 'सामान्य गलतियां',
    officialManual: 'आधिकारिक मैनुअल लिंक',
    bookmarkAdded: 'बुकमार्क में जोड़ा गया',
    bookmarkRemoved: 'बुकमार्क से हटाया गया',

    // Markers Page
    markerGuideTitle: 'ArUco मार्कर शीट जनरेटर',
    markerGuideDesc: 'इन 4x4 मार्कर्स (5 सेमी x 5 सेमी अनुशंसित) को प्रिंट करें और उपकरण के सामने समतल चिपकाएं।',
    printSheet: 'A4 शीट प्रिंट करें',
    markerSizeCm: 'मार्कर आकार (सेमी)',

    // Admin
    adminTitle: 'प्रशिक्षक व लैब एडमिन पोर्टल',
    addInstrument: 'नया उपकरण जोड़ें',
    staffReviewerName: 'समीक्षक शिक्षक का नाम',
    saveChanges: 'परिवर्तन सहेजें',
    deleteInstrument: 'हटाएं',
    markAsReviewed: 'सत्यापित चिह्नित करें',
  },
};
