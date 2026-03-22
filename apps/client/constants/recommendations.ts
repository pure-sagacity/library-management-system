const recommendations = [
    "Based on your love of literary fiction and historical narratives.",
    "Pulitzer Prize winner.",
    "A compelling exploration of human nature and society.",
    "Richly developed characters and intricate storytelling.",
    "A thought-provoking narrative that challenges conventions.",
    "A masterful blend of history and fiction that captivates readers.",
    "An unforgettable journey through the complexities of life and love.",
    "A literary masterpiece that resonates with readers of all backgrounds.",
    "A profound and moving story that leaves a lasting impact on readers.",
    "A beautifully written novel that explores themes of identity, family, and resilience.",
    "A captivating and emotionally charged narrative that delves into the human experience.",
];

function getRandomRecommendation() {
    const randomIndex = Math.floor(Math.random() * recommendations.length);
    return recommendations[randomIndex];
}

export { recommendations, getRandomRecommendation };