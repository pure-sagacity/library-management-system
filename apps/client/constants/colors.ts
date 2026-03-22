const colors = [
    "gray-500",
    "slate-500",
    "zinc-500",
    "stone-500",
    "red-500",
    "orange-500",
    "amber-500",
    "yellow-500",
    "lime-500",
    "green-500",
    "emerald-500",
    "teal-500",
    "cyan-500",
    "sky-500",
    "blue-500",
    "indigo-500",
    "violet-500",
    "purple-500",
    "fuchsia-500",
    "pink-500",
    "rose-500",
]

const accentBackgroundColors = colors.map((color) => `bg-${color}`);

function hashStringToIndex(value: string, length: number) {
    let hash = 0;

    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }

    return Math.abs(hash) % length;
}

function getRandomColor() {
    const randomIndex = Math.floor(Math.random() * accentBackgroundColors.length);
    return accentBackgroundColors[randomIndex];
}

function getStableColorClass(key: string) {
    const stableIndex = hashStringToIndex(key, accentBackgroundColors.length);
    return accentBackgroundColors[stableIndex];
}

export { colors, getRandomColor, getStableColorClass }