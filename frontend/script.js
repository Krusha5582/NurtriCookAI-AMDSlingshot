const sections = {
    login: document.getElementById("login"),
    onboarding: document.getElementById("onboarding"),
    dashboard: document.getElementById("dashboard")
};

const loginForm = document.getElementById("login-form");
const onboardingForm = document.getElementById("onboarding-form");
const restartButton = document.getElementById("restart-flow");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");

const goalInput = document.getElementById("goal");
const dietInput = document.getElementById("diet");
const restrictionsInput = document.getElementById("restrictions");
const ingredientsInput = document.getElementById("ingredients-input");
const ingredientsChips = document.getElementById("ingredients-chips");

const todayGreeting = document.getElementById("today-greeting");
const todayTitle = document.getElementById("today-title");
const todayPlanList = document.getElementById("today-plan-list");
const missingIngredientsWrap = document.getElementById("missing-ingredients");
const groceryButton = document.getElementById("grocery-btn");

const followYesButton = document.getElementById("follow-yes");
const followNoButton = document.getElementById("follow-no");
const followStatus = document.getElementById("follow-status");

const generatePlanButton = document.getElementById("generate-plan");
const aiLoading = document.getElementById("ai-loading");
const weekToggleButton = document.getElementById("week-toggle");
const weeklyWrapper = document.getElementById("weekly-wrapper");
const weeklyPlanGrid = document.getElementById("weekly-plan-grid");
const insightsList = document.getElementById("insights-list");

const cookModal = document.getElementById("cook-modal");
const closeModalButton = document.getElementById("close-modal");
const cookMealName = document.getElementById("cook-meal-name");
const cookSteps = document.getElementById("cook-steps");

const API_BASE = "";

let ingredientTags = [];
let weeklyPlan = [];
let todayIndex = 0;
let adherenceStatus = "";
let isWeekExpanded = false;

const userState = {
    username: "",
    preferences: {
        goal: "",
        diet: "",
        restrictions: "",
        ingredients: []
    }
};

function showSection(sectionKey) {
    Object.values(sections).forEach((section) => section.classList.remove("is-active"));
    sections[sectionKey].classList.add("is-active");
}

function normalize(value) {
    return (value || "").trim().toLowerCase();
}

function saveLocalSession() {
    localStorage.setItem("nutricook_user", JSON.stringify(userState));
}

function restoreLocalSession() {
    const raw = localStorage.getItem("nutricook_user");
    if (!raw) {
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed.username) {
            userState.username = parsed.username;
            usernameInput.value = parsed.username;
        }
        if (parsed.preferences) {
            userState.preferences = parsed.preferences;
            goalInput.value = parsed.preferences.goal || "";
            dietInput.value = parsed.preferences.diet || "";
            restrictionsInput.value = parsed.preferences.restrictions || "";
            ingredientTags = [...(parsed.preferences.ingredients || [])];
            renderIngredientChips();
        }
    } catch {
        localStorage.removeItem("nutricook_user");
    }
}

function renderIngredientChips() {
    ingredientsChips.innerHTML = "";

    ingredientTags.forEach((ingredient, index) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = ingredient;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "chip-remove";
        removeButton.textContent = "x";
        removeButton.addEventListener("click", () => {
            ingredientTags.splice(index, 1);
            renderIngredientChips();
        });

        chip.appendChild(removeButton);
        ingredientsChips.appendChild(chip);
    });
}

function addIngredientsFromInput() {
    const raw = ingredientsInput.value.trim();
    if (!raw) {
        return;
    }

    raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => {
            if (!ingredientTags.includes(item)) {
                ingredientTags.push(item);
            }
        });

    ingredientsInput.value = "";
    renderIngredientChips();
}

function setLoading(stepText = "") {
    aiLoading.classList.toggle("is-visible", Boolean(stepText));
    aiLoading.textContent = stepText;
}

function setWeekExpanded(expanded) {
    isWeekExpanded = expanded;
    weeklyWrapper.classList.toggle("is-collapsed", !expanded);
    weekToggleButton.textContent = expanded ? "Hide Full Week" : "View Full Week";
}

function openCookModal(meal) {
    cookMealName.textContent = meal.name;
    cookSteps.innerHTML = "";

    meal.steps.forEach((step) => {
        const item = document.createElement("li");
        item.textContent = step;
        cookSteps.appendChild(item);
    });

    cookModal.classList.add("is-open");
    cookModal.setAttribute("aria-hidden", "false");
}

function closeCookModal() {
    cookModal.classList.remove("is-open");
    cookModal.setAttribute("aria-hidden", "true");
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json"
        },
        ...options
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}

async function saveUserToBackend() {
    await apiRequest("/user", {
        method: "POST",
        body: JSON.stringify({
            username: userState.username,
            password: "demo",
            ...userState.preferences
        })
    });
}

async function fetchPlanFromBackend() {
    setLoading("Analyzing your preferences...");
    await new Promise((resolve) => setTimeout(resolve, 700));

    setLoading("Generating your personalized plan...");
    const result = await apiRequest("/plan");
    await new Promise((resolve) => setTimeout(resolve, 800));

    weeklyPlan = result.weeklyPlan || [];
    todayIndex = result.todayIndex || 0;
    renderTodayPlan();
    renderWeeklyPlan();
    renderInsights(result.insights || []);

    setLoading("");
}

async function fetchMissingIngredients() {
    const result = await apiRequest("/ingredients-missing");
    const missing = result.missingIngredients || [];

    missingIngredientsWrap.innerHTML = "";

    if (!missing.length) {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = "No missing items";
        missingIngredientsWrap.appendChild(chip);
        return;
    }

    missing.forEach((item) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = item;
        missingIngredientsWrap.appendChild(chip);
    });
}

function renderInsights(items) {
    insightsList.innerHTML = "";

    const insights = items.length
        ? items
        : [
            "Balanced protein intake across the week",
            "Meals aligned with your selected restriction",
            "Minimizing unused ingredients from your pantry"
        ];

    if (adherenceStatus === "No") {
        insights.push("Tomorrow can prioritize easier prep options.");
    }

    insights.slice(0, 3).forEach((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        insightsList.appendChild(li);
    });
}

function mealTypeLabel(key) {
    return key.charAt(0).toUpperCase() + key.slice(1);
}

async function handleSwap(meal, mealType, onChanged) {
    const result = await apiRequest("/swap", {
        method: "POST",
        body: JSON.stringify({
            mealType,
            currentMealName: meal.name,
            goal: userState.preferences.goal,
            diet: userState.preferences.diet,
            restrictions: userState.preferences.restrictions,
            ingredients: userState.preferences.ingredients
        })
    });

    return (result.alternatives || []).map((alt) => {
        return {
            ...alt,
            type: mealType
        };
    });
}

function createMealItem(mealType, meal, onChanged) {
    const item = document.createElement("li");
    item.className = "meal-item";

    const topRow = document.createElement("div");
    topRow.className = "meal-top";

    const left = document.createElement("div");

    const type = document.createElement("p");
    type.className = "meal-type";
    type.textContent = mealTypeLabel(mealType);

    const name = document.createElement("p");
    name.className = "meal-name";
    name.textContent = meal.name;

    left.appendChild(type);
    left.appendChild(name);

    const controls = document.createElement("div");
    controls.className = "action-row";

    const swapButton = document.createElement("button");
    swapButton.type = "button";
    swapButton.className = "btn btn-secondary compact-btn";
    swapButton.textContent = "Swap";

    const cookButton = document.createElement("button");
    cookButton.type = "button";
    cookButton.className = "btn btn-secondary compact-btn";
    cookButton.textContent = "Cook";

    controls.appendChild(swapButton);
    controls.appendChild(cookButton);

    topRow.appendChild(left);
    topRow.appendChild(controls);

    const why = document.createElement("p");
    why.className = "meal-why";
    why.textContent = meal.reason;

    const swapMeta = document.createElement("p");
    swapMeta.className = "swap-meta";
    swapMeta.textContent = "Suggested swaps based on your ingredients";
    swapMeta.hidden = true;

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "swap-options";

    swapButton.addEventListener("click", async () => {
        swapMeta.hidden = false;
        optionsWrap.innerHTML = "";
        optionsWrap.classList.add("is-open");

        const alts = await handleSwap(meal, mealType, onChanged);

        alts.forEach((altMeal) => {
            const altButton = document.createElement("button");
            altButton.type = "button";
            altButton.className = "alt-meal";
            altButton.textContent = altMeal.name;

            altButton.addEventListener("click", () => {
                meal.name = altMeal.name;
                meal.reason = altMeal.reason;
                meal.ingredients = altMeal.ingredients;
                meal.steps = altMeal.steps;
                name.textContent = meal.name;
                why.textContent = meal.reason;
                optionsWrap.classList.remove("is-open");
                if (onChanged) {
                    onChanged();
                }
            });

            optionsWrap.appendChild(altButton);
        });
    });

    cookButton.addEventListener("click", () => {
        openCookModal(meal);
    });

    item.appendChild(topRow);
    item.appendChild(why);
    item.appendChild(swapMeta);
    item.appendChild(optionsWrap);
    return item;
}

function renderTodayPlan() {
    todayPlanList.innerHTML = "";
    if (!weeklyPlan.length) {
        return;
    }

    const todayPlan = weeklyPlan[todayIndex];
    todayGreeting.textContent = `Good morning, ${userState.username || "there"} \u2600\uFE0F`;
    todayTitle.textContent = `Today's Plan (${todayPlan.day})`;

    ["breakfast", "lunch", "dinner"].forEach((mealType) => {
        const meal = todayPlan.meals[mealType];
        todayPlanList.appendChild(createMealItem(mealType, meal, renderAfterMealChange));
    });
}

function renderWeeklyPlan() {
    weeklyPlanGrid.innerHTML = "";

    weeklyPlan.forEach((dayPlan, dayIdx) => {
        const dayCard = document.createElement("article");
        dayCard.className = "week-card";

        const title = document.createElement("h3");
        title.className = "week-day";
        title.textContent = dayPlan.day;

        const list = document.createElement("ul");
        list.className = "meal-list";

        ["breakfast", "lunch", "dinner"].forEach((mealType) => {
            const meal = dayPlan.meals[mealType];
            list.appendChild(createMealItem(mealType, meal, () => {
                if (dayIdx === todayIndex) {
                    renderAfterMealChange();
                }
            }));
        });

        dayCard.appendChild(title);
        dayCard.appendChild(list);
        weeklyPlanGrid.appendChild(dayCard);
    });
}

function renderAfterMealChange() {
    renderTodayPlan();
    renderWeeklyPlan();
    fetchMissingIngredients().catch(() => {
        missingIngredientsWrap.innerHTML = "";
    });
}

function resetDashboard() {
    weeklyPlan = [];
    todayIndex = 0;
    adherenceStatus = "";
    followStatus.textContent = "";

    setWeekExpanded(false);
    setLoading("");

    todayGreeting.textContent = "Good morning, there \u2600\uFE0F";
    todayTitle.textContent = "Today's Plan (Day 1)";
    todayPlanList.innerHTML = "";
    weeklyPlanGrid.innerHTML = "";
    insightsList.innerHTML = "";
    missingIngredientsWrap.innerHTML = "";
}

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        loginError.textContent = "Please enter both username and password.";
        return;
    }

    userState.username = username;
    loginError.textContent = "";
    saveLocalSession();
    showSection("onboarding");
});

onboardingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    addIngredientsFromInput();

    userState.preferences = {
        goal: goalInput.value,
        diet: dietInput.value,
        restrictions: restrictionsInput.value,
        ingredients: [...ingredientTags]
    };

    saveLocalSession();

    try {
        await saveUserToBackend();
        showSection("dashboard");
        resetDashboard();
        await fetchPlanFromBackend();
        await fetchMissingIngredients();
    } catch {
        setLoading("");
        alert("Could not connect to backend. Start server with: node server.js");
    }
});

ingredientsInput.addEventListener("keydown", (event) => {
    if (event.key === "," || event.key === "Enter") {
        event.preventDefault();
        addIngredientsFromInput();
    }
});

ingredientsInput.addEventListener("blur", addIngredientsFromInput);

generatePlanButton.addEventListener("click", async () => {
    try {
        await fetchPlanFromBackend();
        await fetchMissingIngredients();
    } catch {
        setLoading("");
    }
});

weekToggleButton.addEventListener("click", () => {
    setWeekExpanded(!isWeekExpanded);
});

followYesButton.addEventListener("click", () => {
    adherenceStatus = "Yes";
    followStatus.textContent = "Great consistency! \uD83D\uDD25";
});

followNoButton.addEventListener("click", () => {
    adherenceStatus = "No";
    followStatus.textContent = "We'll improve tomorrow's plan.";
});

groceryButton.addEventListener("click", () => {
    const items = [...missingIngredientsWrap.querySelectorAll(".chip")].map((chip) => chip.textContent);
    if (!items.length || (items.length === 1 && items[0] === "No missing items")) {
        followStatus.textContent = "You're all set. No grocery items needed today.";
        return;
    }
    followStatus.textContent = `Grocery list ready: ${items.join(", ")}`;
});

closeModalButton.addEventListener("click", closeCookModal);

cookModal.addEventListener("click", (event) => {
    if (event.target === cookModal) {
        closeCookModal();
    }
});

restartButton.addEventListener("click", () => {
    loginForm.reset();
    onboardingForm.reset();

    userState.username = "";
    userState.preferences = {
        goal: "",
        diet: "",
        restrictions: "",
        ingredients: []
    };

    ingredientTags = [];
    renderIngredientChips();
    resetDashboard();

    localStorage.removeItem("nutricook_user");
    showSection("login");
});

restoreLocalSession();
