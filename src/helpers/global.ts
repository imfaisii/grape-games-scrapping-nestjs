export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const extractSubstring = (
  inputString: string,
  startSubstring: string,
  endSubstring: string,
): string => {
  const startIndex = inputString.indexOf(startSubstring);
  if (startIndex === -1) {
    return null; // Start substring not found
  }

  const endIndex = inputString.indexOf(
    endSubstring,
    startIndex + startSubstring.length,
  );
  if (endIndex === -1) {
    return null; // End substring not found
  }

  const extractedString = inputString.substring(
    startIndex + startSubstring.length,
    endIndex,
  );

  return extractedString;
};

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T[];
}

export function createApiResponse<T>(
  status: boolean,
  message: string,
  data?: T[],
): ApiResponse<T> {
  return {
    status: status,
    message: message,
    data: data,
  };
}
