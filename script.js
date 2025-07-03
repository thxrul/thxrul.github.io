const terminal = document.getElementById('terminal');
const pfp = document.getElementById('pfp');
const footer = document.getElementById('footer');
const githubUsername = "thxrul";

fetch(`https://api.github.com/users/${githubUsername}`)
    .then(response => response.json())
    .then(data => {
        pfp.src = data.avatar_url;
    });

footer.innerHTML = `
    <a href="https://twitter.com/logout" target="_blank">Twitter</a>
    <a href="https://github.com/${githubUsername}" target="_blank" class="github-link">GitHub</a>
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube</a>
`;

const info = [
    { label: "Name:", value: "tharul" },
    { label: "Studying at:", value: "VU@NSBM" },
    { 
        label: "Currently learning:", 
        value: `
            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v5/icons/python.svg" alt="Python" class="lang-icon">
            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v5/icons/rust.svg" alt="Rust" class="lang-icon">
            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v5/icons/go.svg" alt="Go" class="lang-icon">
        `,
        isHtml: true
    },
    { label: "Hobbies:", value: "nerdy shit" }
];

let currentLine = 0;
let charIndex = 0;

function type() {
    if (currentLine >= info.length) {
        terminal.style.borderRight = 'none';
        return;
    }

    const lineDiv = document.createElement('div');
    lineDiv.className = 'line';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'value';

    lineDiv.appendChild(labelSpan);
    lineDiv.appendChild(valueSpan);
    terminal.appendChild(lineDiv);

    typeLabel(labelSpan, valueSpan);
}

function typeLabel(labelSpan, valueSpan) {
    if (charIndex < info[currentLine].label.length) {
        labelSpan.textContent += info[currentLine].label.charAt(charIndex);
        charIndex++;
        setTimeout(() => typeLabel(labelSpan, valueSpan), 50);
    } else {
        charIndex = 0;
        typeValue(valueSpan);
    }
}

function typeValue(valueSpan) {
    const currentInfo = info[currentLine];
    if (currentInfo.isHtml) {
        valueSpan.innerHTML = currentInfo.value;
        currentLine++;
        setTimeout(type, 500);
    } else {
        if (charIndex < currentInfo.value.length) {
            valueSpan.textContent += currentInfo.value.charAt(charIndex);
            charIndex++;
            setTimeout(() => typeValue(valueSpan), 50);
        } else {
            charIndex = 0;
            currentLine++;
            setTimeout(type, 500);
        }
    }
}

type();