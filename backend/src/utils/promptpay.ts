import generatePayload from 'promptpay-qr';
import qrcode from 'qrcode';

/**
 * Generates a PromptPay QR code as a Data URL (base64 PNG)
 * @param promptPayId Target phone number (e.g. 0812345678) or National ID (e.g. 1100100234567)
 * @param amount Donation amount
 * @returns Base64 image data URL
 */
export async function generatePromptPayQR(promptPayId: string, amount: number): Promise<string> {
  try {
    // Format PromptPay ID: remove dashes, spaces, etc.
    const cleanId = promptPayId.replace(/[-\s]/g, '');
    const payload = generatePayload(cleanId, { amount });
    const qrDataUrl = await qrcode.toDataURL(payload);
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating PromptPay QR:', error);
    throw new Error('Failed to generate PromptPay QR code');
  }
}
