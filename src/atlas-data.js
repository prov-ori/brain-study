export const CATEGORIES = {
  cortex: ["Кора: извилины и борозды", "#cfa6a0"],
  cerebellum: ["Мозжечок", "#bd8e89"],
  brainstem: ["Ствол мозга", "#d2b09b"],
  deep_grey: ["Подкорковые ядра", "#c0a1db"],
  diencephalon: ["Промежуточный мозг", "#e8b16f"],
  white_matter: ["Белое вещество", "#e6dbcb"],
  tracts: ["Проводящие пути", "#8eb9c0"],
  ventricles: ["Желудочки", "#75bfdf"],
  arteries: ["Артерии", "#c96666"],
  veins_sinuses: ["Вены и синусы", "#7b8bbb"],
  cranial_nerves: ["Черепные нервы", "#dbc685"],
  meninges_dura: ["Оболочки", "#c1b8b1"],
};
export function regionOf(n) {
  for (const [id, label] of Object.entries({
    frontal: "Frontal lobe",
    parietal: "Parietal lobe",
    temporal: "Temporal lobe",
    occipital: "Occipital lobe",
  })) {
    if (n.category === "cortex" && n.ta2.includes(label)) return id;
  }
  if (n.label === "Hippocampus") return "hippocampus";
  if (/amygdal/i.test(n.label) || n.ta2.includes("Amygdaloid body"))
    return "amygdala";
  if (n.label === "Thalamus" || n.ta2.includes("Thalamus")) return "thalamus";
  if (n.label === "Corpus callosum") return "corpuscallosum";
  if (n.category === "cerebellum" || n.category === "brainstem")
    return n.category;
  return null;
}
export function filterNodes(
  nodes,
  { query = "", category = "", side = "both" },
) {
  const q = query.trim().toLocaleLowerCase();
  return nodes.filter(
    (n) =>
      (!category || n.category === category) &&
      (side === "both" || n.side === side || n.side === "median") &&
      (!q ||
        [
          n.label,
          n.name,
          CATEGORIES[n.category]?.[0],
          REGION_NAMES[regionOf(n)],
          ...(n.ta2 || []),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(q)),
  );
}
const REGION_NAMES = {
  frontal: "лобная доля",
  parietal: "теменная доля",
  temporal: "височная доля",
  occipital: "затылочная доля",
  hippocampus: "гиппокамп",
  amygdala: "миндалевидное тело миндалина",
  thalamus: "таламус",
  corpuscallosum: "мозолистое тело",
  cerebellum: "мозжечок",
  brainstem: "ствол мозга",
};
export function readProgress(storage) {
  try {
    const p = JSON.parse(storage.getItem("neuroatlas21") || "{}");
    return {
      lessons: [
        ...new Set(
          (Array.isArray(p?.lessons) ? p.lessons : []).filter(
            (i) => Number.isInteger(i) && i >= 0 && i < 5,
          ),
        ),
      ],
    };
  } catch {
    return { lessons: [] };
  }
}
export function advanceQuiz(state, answer, questions) {
  if (
    state.finished ||
    state.answered ||
    !Number.isInteger(answer) ||
    answer < 0 ||
    answer >= questions[state.index][1].length
  )
    return state;
  return {
    ...state,
    answered: true,
    score: state.score + Number(answer === questions[state.index][2]),
  };
}
export function nextQuestion(state, total) {
  if (!state.answered || state.finished) return state;
  return state.index === total - 1
    ? { ...state, finished: true }
    : { ...state, index: state.index + 1, answered: false };
}
