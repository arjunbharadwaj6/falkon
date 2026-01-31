/**
 * Convert Firestore Timestamp to ISO string
 * Handles both Firestore Timestamp objects and regular Date objects
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  // If it's a Firestore Timestamp object with toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // If it's a string, return as-is
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  // If it's a number (milliseconds), convert to date
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString();
  }
  
  return null;
};

/**
 * Convert all date fields in an object to ISO strings
 */
export const formatDatesInObject = (obj, dateFields = ['createdAt', 'updatedAt', 'approvedAt']) => {
  if (!obj) return obj;
  
  const formatted = { ...obj };
  dateFields.forEach(field => {
    if (field in formatted) {
      formatted[field] = formatTimestamp(formatted[field]);
    }
  });
  
  return formatted;
};
