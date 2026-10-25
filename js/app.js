const qrForm = document.getElementById('qrForm');
const qrInput = document.getElementById('qrInput');
const qrContainer = document.getElementById('qrcode');
const downloadButton = document.getElementById('downloadButton');
const statusMessage = document.getElementById('status');
const qrSettings = [
    document.getElementById('qrSize'),
    document.getElementById('darkColor'),
    document.getElementById('lightColor')
];

function clearQR(message) {
    qrContainer.replaceChildren();
    downloadButton.disabled = true;
    statusMessage.textContent = message;
}

qrForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const text = qrInput.value.trim();
    if (!text) {
        qrInput.setCustomValidity('Введіть текст або посилання.');
        qrInput.reportValidity();
        return;
    }
    qrInput.setCustomValidity('');

    if (typeof QRCode === 'undefined') {
        clearQR('Не вдалося завантажити бібліотеку QR-кодів. Перевірте підключення до інтернету й оновіть сторінку.');
        return;
    }

    try {
        const size = Number(document.getElementById('qrSize').value);
        new QRCode(qrContainer, {
            text,
            width: size,
            height: size,
            colorDark: document.getElementById('darkColor').value,
            colorLight: document.getElementById('lightColor').value,
            correctLevel: QRCode.CorrectLevel.H
        });
        downloadButton.disabled = false;
        statusMessage.textContent = 'QR-код готовий. Ви можете завантажити його у форматі PNG.';
    } catch (error) {
        clearQR('Не вдалося створити QR-код. Перевірте текст і спробуйте коротше значення.');
        console.error('QR code generation failed:', error);
    }
});

qrInput.addEventListener('input', () => {
    qrInput.setCustomValidity('');
    clearQR('Текст змінено. Згенеруйте QR-код ще раз.');
});

qrSettings.forEach((setting) => {
    setting.addEventListener('change', () => {
        clearQR('Налаштування змінено. Згенеруйте QR-код ще раз.');
    });
});

downloadButton.addEventListener('click', () => {
    const canvas = qrContainer.querySelector('canvas');
    const image = qrContainer.querySelector('img');
    let imageUrl;

    try {
        imageUrl = canvas ? canvas.toDataURL('image/png') : image?.src;
    } catch (error) {
        clearQR('Не вдалося підготувати зображення для завантаження. Згенеруйте QR-код ще раз.');
        console.error('QR code download preparation failed:', error);
        return;
    }

    if (!imageUrl) {
        clearQR('Не вдалося підготувати зображення для завантаження. Згенеруйте QR-код ще раз.');
        return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'qr-code.png';
    link.click();
});
