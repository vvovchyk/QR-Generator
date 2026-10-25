const messages = {
    empty: 'Введіть текст або виберіть шаблон.',
    edited: 'Дані змінено. Згенеруйте QR-код ще раз.',
    ready: 'QR-код готовий. Можна завантажити PNG або SVG чи скопіювати зображення.',
    missingLibrary: 'Не вдалося завантажити бібліотеку QR-кодів. Перевірте підключення до інтернету й оновіть сторінку.',
    generationError: 'Не вдалося створити QR-код. Перевірте дані або спробуйте коротший текст.',
    downloadError: 'Не вдалося підготувати файл. Згенеруйте QR-код ще раз.',
    copyUnsupported: 'Цей браузер не підтримує копіювання зображень. Завантажте PNG-файл.',
    copied: 'Зображення QR-коду скопійовано.',
    copyError: 'Не вдалося скопіювати зображення. Перевірте дозвіл браузера на доступ до буфера обміну.',
    lowContrast: 'Контраст кольорів низький. Виберіть темніший колір QR-коду та світліший фон для надійнішого сканування.',
    reversed: 'QR-код світліший за фон. Більшість сканерів краще читають темний код на світлому фоні.'
};

const templates = {
    text: [
        { name: 'text', label: 'Текст або посилання', type: 'textarea', required: true, rows: 4, placeholder: 'https://example.com' }
    ],
    wifi: [
        { name: 'ssid', label: 'Назва мережі (SSID)', required: true, autocomplete: 'off' },
        { name: 'security', label: 'Захист мережі', type: 'select', options: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'Без пароля']] },
        { name: 'password', label: 'Пароль Wi-Fi', type: 'password', required: true, condition: { field: 'security', value: 'nopass', hideWhenMatches: true }, autocomplete: 'new-password' },
        { name: 'hidden', label: 'Прихована мережа', type: 'checkbox' }
    ],
    vcard: [
        { name: 'firstName', label: "Ім'я", required: true, autocomplete: 'given-name' },
        { name: 'lastName', label: 'Прізвище', autocomplete: 'family-name' },
        { name: 'organization', label: 'Організація' },
        { name: 'title', label: 'Посада' },
        { name: 'contactPhone', label: 'Телефон', type: 'tel', autocomplete: 'tel' },
        { name: 'contactEmail', label: 'Електронна пошта', type: 'email', autocomplete: 'email' },
        { name: 'website', label: 'Вебсайт', type: 'url', placeholder: 'https://example.com' },
        { name: 'address', label: 'Адреса', type: 'textarea', rows: 2 }
    ],
    email: [
        { name: 'email', label: 'Адреса одержувача', type: 'email', required: true, autocomplete: 'email' },
        { name: 'subject', label: 'Тема' },
        { name: 'body', label: 'Повідомлення', type: 'textarea', rows: 3 }
    ],
    phone: [
        { name: 'phone', label: 'Номер телефону', type: 'tel', required: true, placeholder: '+380 00 000 00 00', autocomplete: 'tel' }
    ],
    sms: [
        { name: 'smsPhone', label: 'Номер телефону', type: 'tel', required: true, placeholder: '+380 00 000 00 00', autocomplete: 'tel' },
        { name: 'smsMessage', label: 'Текст повідомлення', type: 'textarea', rows: 3 }
    ]
};

const presets = {
    screen: { size: '300', dark: '#172033', light: '#ffffff' },
    print: { size: '500', dark: '#000000', light: '#ffffff' },
    natural: { size: '400', dark: '#244b3f', light: '#f5f2e8' }
};

const qrForm = document.getElementById('qrForm');
const templateSelect = document.getElementById('qrType');
const templateFields = document.getElementById('templateFields');
const presetSelect = document.getElementById('qrPreset');
const sizeSelect = document.getElementById('qrSize');
const darkColor = document.getElementById('darkColor');
const lightColor = document.getElementById('lightColor');
const qrContainer = document.getElementById('qrcode');
const qrEngine = document.getElementById('qrEngine');
const statusMessage = document.getElementById('status');
const contrastWarning = document.getElementById('contrastWarning');
const pngButton = document.getElementById('downloadPngButton');
const svgButton = document.getElementById('downloadSvgButton');
const copyButton = document.getElementById('copyButton');
const clearButton = document.getElementById('clearButton');
let currentQr = null;

function setStatus(message, type = '') {
    statusMessage.textContent = message;
    statusMessage.classList.toggle('status-error', type === 'error');
    statusMessage.classList.toggle('status-warning', type === 'warning');
}

function invalidateQr(message = messages.edited) {
    currentQr = null;
    qrContainer.replaceChildren();
    qrEngine.replaceChildren();
    pngButton.disabled = true;
    svgButton.disabled = true;
    copyButton.disabled = true;
    contrastWarning.hidden = true;
    setStatus(message);
}

function createField(definition) {
    const wrapper = document.createElement('div');
    wrapper.className = definition.type === 'checkbox' ? 'field checkbox-field' : 'field';
    if (definition.type === 'textarea') wrapper.classList.add('field-wide');
    if (definition.condition) {
        wrapper.dataset.conditionField = definition.condition.field;
        wrapper.dataset.conditionValue = definition.condition.value;
        wrapper.dataset.hideWhenMatches = String(definition.condition.hideWhenMatches);
    }

    const label = document.createElement('label');
    const id = `field-${definition.name}`;
    label.htmlFor = id;

    if (definition.type === 'checkbox') {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.name = definition.name;
        label.append(input, document.createTextNode(` ${definition.label}`));
        wrapper.append(label);
        return wrapper;
    }

    label.textContent = definition.label;
    let input;

    if (definition.type === 'select') {
        input = document.createElement('select');
        definition.options.forEach(([value, text]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            input.append(option);
        });
    } else if (definition.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = definition.rows || 3;
    } else {
        input = document.createElement('input');
        input.type = definition.type || 'text';
    }

    input.id = id;
    input.name = definition.name;
    input.required = Boolean(definition.required);
    if (definition.required) input.dataset.required = 'true';
    if (definition.placeholder) input.placeholder = definition.placeholder;
    if (definition.autocomplete) input.autocomplete = definition.autocomplete;
    wrapper.append(label, input);
    return wrapper;
}

function updateConditionalFields() {
    templateFields.querySelectorAll('[data-condition-field]').forEach((wrapper) => {
        const controllingField = templateFields.querySelector(`[name="${wrapper.dataset.conditionField}"]`);
        const matches = controllingField?.value === wrapper.dataset.conditionValue;
        const shouldHide = matches === (wrapper.dataset.hideWhenMatches === 'true');
        wrapper.hidden = shouldHide;
        const input = wrapper.querySelector('input, select, textarea');
        if (input) input.required = !shouldHide && input.dataset.required === 'true';
    });
}

function renderTemplateFields() {
    templateFields.replaceChildren(...templates[templateSelect.value].map(createField));
    updateConditionalFields();
}

function fieldValue(name) {
    const value = new FormData(qrForm).get(name);
    return typeof value === 'string' ? value.trim() : '';
}

function escapeWifi(value) {
    return value.replace(/([\\;,":])/g, '\\$1');
}

function escapeVCard(value) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, '\\n')
        .replace(/([,;])/g, '\\$1');
}

function buildPayload() {
    switch (templateSelect.value) {
        case 'wifi': {
            const security = fieldValue('security');
            const parts = [
                `T:${security}`,
                `S:${escapeWifi(fieldValue('ssid'))}`
            ];
            if (security !== 'nopass') parts.push(`P:${escapeWifi(fieldValue('password'))}`);
                    if (qrForm.elements.namedItem('hidden').checked) parts.push('H:true');
            return `WIFI:${parts.join(';')};;`;
        }
        case 'vcard': {
            const firstName = escapeVCard(fieldValue('firstName'));
            const lastName = escapeVCard(fieldValue('lastName'));
            const lines = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `N:${lastName};${firstName};;;`,
                `FN:${[firstName, lastName].filter(Boolean).join(' ')}`
            ];
            const optionalLines = [
                ['organization', 'ORG'],
                ['title', 'TITLE'],
                ['contactPhone', 'TEL;TYPE=CELL'],
                ['contactEmail', 'EMAIL'],
                ['website', 'URL']
            ];
            optionalLines.forEach(([field, prefix]) => {
                const value = fieldValue(field);
                if (value) lines.push(`${prefix}:${escapeVCard(value)}`);
            });
            const address = fieldValue('address');
            if (address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(address)};;;;`);
            lines.push('END:VCARD');
            return lines.join('\r\n');
        }
        case 'email': {
            const recipient = fieldValue('email');
            const params = new URLSearchParams();
            const subject = fieldValue('subject');
            const body = fieldValue('body');
            if (subject) params.set('subject', subject);
            if (body) params.set('body', body);
            const query = params.toString();
            return `mailto:${recipient}${query ? `?${query}` : ''}`;
        }
        case 'phone':
            return `tel:${fieldValue('phone').replace(/\s+/g, '')}`;
        case 'sms': {
            const number = fieldValue('smsPhone').replace(/\s+/g, '');
            const message = fieldValue('smsMessage');
            return `SMSTO:${number}:${message}`;
        }
        default:
            return fieldValue('text');
    }
}

function hexLuminance(hex) {
    const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => {
        const value = parseInt(channel, 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function getContrastWarning() {
    const darkLuminance = hexLuminance(darkColor.value);
    const lightLuminance = hexLuminance(lightColor.value);
    const lighter = Math.max(darkLuminance, lightLuminance);
    const darker = Math.min(darkLuminance, lightLuminance);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    if (darkLuminance >= lightLuminance) return messages.reversed;
    if (ratio < 4.5) return messages.lowContrast;
    return '';
}

function drawQrCanvas(matrix, size, dark, light) {
    const quietZone = 4;
    const moduleCount = matrix.length;
    const totalModules = moduleCount + quietZone * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is unavailable.');

    context.fillStyle = light;
    context.fillRect(0, 0, size, size);
    context.fillStyle = dark;
    matrix.forEach((row, rowIndex) => {
        row.forEach((isDark, columnIndex) => {
            if (!isDark) return;
            const left = Math.round(((columnIndex + quietZone) * size) / totalModules);
            const top = Math.round(((rowIndex + quietZone) * size) / totalModules);
            const right = Math.round(((columnIndex + quietZone + 1) * size) / totalModules);
            const bottom = Math.round(((rowIndex + quietZone + 1) * size) / totalModules);
            context.fillRect(left, top, right - left, bottom - top);
        });
    });
    return canvas;
}

function createSvg(matrix, size, dark, light) {
    const quietZone = 4;
    const totalModules = matrix.length + quietZone * 2;
    const path = [];
    matrix.forEach((row, rowIndex) => {
        row.forEach((isDark, columnIndex) => {
            if (isDark) path.push(`M${columnIndex + quietZone},${rowIndex + quietZone}h1v1h-1z`);
        });
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${totalModules} ${totalModules}" shape-rendering="crispEdges"><path fill="${light}" d="M0 0h${totalModules}v${totalModules}H0z"/><path fill="${dark}" d="${path.join('')}"/></svg>`;
    return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

qrForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) {
        setStatus(messages.empty, 'error');
        return;
    }

    if (typeof QRCode === 'undefined') {
        invalidateQr(messages.missingLibrary);
        return;
    }

    try {
        invalidateQr();
        const size = Number(sizeSelect.value);
        const qrCode = new QRCode(qrEngine, {
            text: payload,
            width: size,
            height: size,
            colorDark: darkColor.value,
            colorLight: lightColor.value,
            correctLevel: QRCode.CorrectLevel.H
        });
        const model = qrCode._oQRCode;
        if (!model || typeof model.getModuleCount !== 'function' || typeof model.isDark !== 'function') {
            throw new Error('The QR code matrix could not be read.');
        }

        const moduleCount = model.getModuleCount();
        const matrix = Array.from({ length: moduleCount }, (_, row) =>
            Array.from({ length: moduleCount }, (_, column) => model.isDark(row, column))
        );
        const canvas = drawQrCanvas(matrix, size, darkColor.value, lightColor.value);
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Згенерований QR-код');
        qrContainer.replaceChildren(canvas);
        currentQr = { payload, matrix, canvas, size, dark: darkColor.value, light: lightColor.value };
        pngButton.disabled = false;
        svgButton.disabled = false;
        copyButton.disabled = false;

        const warning = getContrastWarning();
        contrastWarning.textContent = warning;
        contrastWarning.hidden = !warning;
        setStatus(messages.ready, warning ? 'warning' : '');
    } catch (error) {
        invalidateQr(messages.generationError);
        console.error('QR code generation failed:', error);
    }
});

qrForm.addEventListener('input', (event) => {
    if (event.target.closest('#templateFields')) invalidateQr();
    if (event.target === darkColor || event.target === lightColor) {
        presetSelect.value = 'custom';
        invalidateQr();
    }
});

qrForm.addEventListener('change', (event) => {
    if (event.target === templateSelect) {
        renderTemplateFields();
        invalidateQr();
    } else if (event.target.name === 'security') {
        updateConditionalFields();
        invalidateQr();
    } else if (event.target === presetSelect) {
        const preset = presets[presetSelect.value];
        if (preset) {
            sizeSelect.value = preset.size;
            darkColor.value = preset.dark;
            lightColor.value = preset.light;
        }
        invalidateQr();
    } else if (event.target === sizeSelect) {
        presetSelect.value = 'custom';
        invalidateQr();
    }
});

document.getElementById('downloadPngButton').addEventListener('click', async () => {
    if (!currentQr) return;
    try {
        const blob = await new Promise((resolve) => currentQr.canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG export returned no image data.');
        downloadBlob(blob, 'qr-code.png');
    } catch (error) {
        setStatus(messages.downloadError, 'error');
        console.error('QR code PNG export failed:', error);
    }
});

document.getElementById('downloadSvgButton').addEventListener('click', () => {
    if (!currentQr) return;
    try {
        downloadBlob(createSvg(currentQr.matrix, currentQr.size, currentQr.dark, currentQr.light), 'qr-code.svg');
    } catch (error) {
        setStatus(messages.downloadError, 'error');
        console.error('QR code SVG export failed:', error);
    }
});

document.getElementById('copyButton').addEventListener('click', async () => {
    if (!currentQr) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        setStatus(messages.copyUnsupported, 'error');
        return;
    }

    try {
        const blob = await new Promise((resolve) => currentQr.canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG export returned no image data.');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setStatus(messages.copied);
    } catch (error) {
        setStatus(messages.copyError, 'error');
        console.error('QR code clipboard copy failed:', error);
    }
});

clearButton.addEventListener('click', () => {
    qrForm.reset();
    renderTemplateFields();
    invalidateQr(messages.empty);
});

renderTemplateFields();
