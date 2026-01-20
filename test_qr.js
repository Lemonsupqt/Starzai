import QRCode from 'qrcode';
import fs from 'fs';

// Generate a 5500-character test string
const largeData = 'A'.repeat(5500);

console.log(`Testing QR code with ${largeData.length} characters...`);

QRCode.toBuffer(largeData, {
  errorCorrectionLevel: 'L',
  type: 'png',
  margin: 4,
  width: 2048,
  quality: 1.0,
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
}).then(buffer => {
  fs.writeFileSync('test_qr_large.png', buffer);
  console.log(`✅ Success! Generated QR code: ${(buffer.length / 1024).toFixed(2)} KB`);
  console.log(`   Resolution: 2048x2048`);
  console.log(`   Format: PNG (lossless)`);
  console.log(`   Error Correction: L (Low)`);
  console.log(`   File: test_qr_large.png`);
}).catch(error => {
  console.log(`❌ Error: ${error.message}`);
});
