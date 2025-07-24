// Content moderation utilities
import { toast } from "sonner";

// Basic profanity word list - in production, use a comprehensive API like Google Perspective API
const PROFANITY_WORDS = [
  'damn', 'hell', 'shit', 'fuck', 'bitch', 'asshole', 'bastard', 'crap', 'piss',
  'whore', 'slut', 'dick', 'cock', 'pussy', 'tits', 'ass', 'fag', 'nigger',
  'retard', 'gay', 'lesbian', 'homo', 'tranny', 'rape', 'nazi', 'hitler',
  'kill', 'murder', 'suicide', 'bomb', 'terrorist', 'drug', 'cocaine', 'heroin',
  'meth', 'weed', 'marijuana', 'porn', 'sex', 'nude', 'naked', 'xxx'
];

// Additional context-aware bad patterns
const BAD_PATTERNS = [
  /k+i+l+l+ *(yo)?u?r? *se?l?f/i,
  /go+ *die+/i,
  /fu+c+k+ *(yo)?u+/i,
  /s+u+c+k+ *m+y+/i,
  /eat+ *s+h+i+t+/i,
  /send+ *nudes?/i,
  /want+ *sex/i,
  /buy+ *drugs?/i,
  /sell+ *drugs?/i
];

export interface ModerationResult {
  isClean: boolean;
  flaggedWords: string[];
  severity: 'low' | 'medium' | 'high';
  cleanedText?: string;
}

export const moderateText = (text: string): ModerationResult => {
  if (!text || text.trim().length === 0) {
    return { isClean: true, flaggedWords: [], severity: 'low' };
  }

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const flaggedWords: string[] = [];

  // Check for direct profanity matches
  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
    if (PROFANITY_WORDS.includes(cleanWord)) {
      flaggedWords.push(word);
    }
  }

  // Check for pattern matches
  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(lowerText)) {
      flaggedWords.push('inappropriate pattern');
      break;
    }
  }

  // Determine severity
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (flaggedWords.length > 3) {
    severity = 'high';
  } else if (flaggedWords.length > 1) {
    severity = 'medium';
  } else if (flaggedWords.length > 0) {
    severity = 'low';
  }

  // Create cleaned text by replacing profanity with asterisks
  let cleanedText = text;
  if (flaggedWords.length > 0) {
    for (const badWord of PROFANITY_WORDS) {
      const regex = new RegExp(`\\b${badWord}\\b`, 'gi');
      cleanedText = cleanedText.replace(regex, '*'.repeat(badWord.length));
    }
  }

  return {
    isClean: flaggedWords.length === 0,
    flaggedWords,
    severity,
    cleanedText
  };
};

export interface ImageModerationResult {
  isClean: boolean;
  confidence: number;
  detectedContent: string[];
  blocked: boolean;
}

// Placeholder for image content moderation
// In production, integrate with services like:
// - Google Cloud Vision API Safe Search
// - Amazon Rekognition Content Moderation
// - Azure Computer Vision Content Moderator
export const moderateImage = async (file: File): Promise<ImageModerationResult> => {
  return new Promise((resolve) => {
    // Simulate API call delay
    setTimeout(() => {
      // Basic file name and type checking for demonstration
      const fileName = file.name.toLowerCase();
      const suspiciousNames = ['nude', 'naked', 'sex', 'porn', 'xxx', 'adult'];

      const hasSuspiciousName = suspiciousNames.some(word => fileName.includes(word));

      // In production, this would analyze the actual image content
      const result: ImageModerationResult = {
        isClean: !hasSuspiciousName,
        confidence: hasSuspiciousName ? 0.85 : 0.05,
        detectedContent: hasSuspiciousName ? ['adult content'] : [],
        blocked: hasSuspiciousName
      };

      resolve(result);
    }, 1000); // Simulate 1 second API call
  });
};

// Enhanced file validation with content moderation
export const validateAndModerateFile = async (file: File): Promise<{
  isValid: boolean;
  error?: string;
  moderationResult?: ImageModerationResult;
}> => {
  // Define file size limits for different types (in bytes)
  const fileSizeLimits = {
    image: 5 * 1024 * 1024,    // 5MB for images
    video: 5 * 1024 * 1024,   // 5MB for videos
    document: 10 * 1024 * 1024, // 10MB for documents
    other: 5 * 1024 * 1024     // 5MB for other files
  };

  // Allowed file types
  const allowedTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/mov', 'video/wmv'],
    document: ['application/pdf', 'text/plain', 'application/msword'],
    other: []
  };

  // Determine file category
  let fileCategory: keyof typeof fileSizeLimits = 'other';
  if (file.type.startsWith('image/')) {
    fileCategory = 'image';
  } else if (file.type.startsWith('video/')) {
    fileCategory = 'video';
  } else if (allowedTypes.document.includes(file.type)) {
    fileCategory = 'document';
  }

  // Check if file type is allowed
  const isTypeAllowed =
    allowedTypes.image.includes(file.type) ||
    allowedTypes.video.includes(file.type) ||
    allowedTypes.document.includes(file.type) ||
    file.type.startsWith('text/');

  if (!isTypeAllowed) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not supported. Please upload images, videos, or documents.`
    };
  }

  // Check file size based on category
  const maxSize = fileSizeLimits[fileCategory];
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

    return {
      isValid: false,
      error: `File size (${fileSizeMB}MB) exceeds the ${maxSizeMB}MB limit for ${fileCategory} files.`
    };
  }

  // Perform content moderation for images and videos
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
    try {
      const moderationResult = await moderateImage(file);

      if (!moderationResult.isClean) {
        return {
          isValid: false,
          error: `File contains inappropriate content and cannot be uploaded. Detected: ${moderationResult.detectedContent.join(', ')}`,
          moderationResult
        };
      }

      return {
        isValid: true,
        moderationResult
      };
    } catch (error) {
      console.error('Content moderation failed:', error);
      // In case of moderation service failure, allow upload but log the issue
      return {
        isValid: true,
        error: 'Content moderation service unavailable, file uploaded without screening.'
      };
    }
  }

  return { isValid: true };
};