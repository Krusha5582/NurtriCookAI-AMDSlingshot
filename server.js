const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

const state = {
    user: null,
    preferences: null,
    lastPlan: null,
    todayIndex: 0
};

const dayLabels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

const mealLibrary = {
    breakfast: [
        { name: "Greek Yogurt Bowl", tags: ["high-protein", "low-sugar", "veg"], ingredients: ["yogurt", "berries", "nuts"], steps: ["Add yogurt to a bowl", "Top with berries", "Sprinkle nuts and serve"] },
        { name: "Veggie Oats Upma", tags: ["veg", "low-sugar"], ingredients: ["oats", "carrot", "peas"], steps: ["Chop vegetables", "Toast oats lightly", "Cook with vegetables and seasoning"] },
        { name: "Scrambled Eggs Toast", tags: ["high-protein", "eggetarian"], ingredients: ["eggs", "bread", "pepper"], steps: ["Whisk eggs", "Scramble on low heat", "Serve with toasted bread"] },
        { name: "Chicken Breakfast Wrap", tags: ["high-protein", "non-veg", "low-carb"], ingredients: ["chicken", "lettuce", "egg"], steps: ["Cook chicken strips", "Warm wrap and layer fillings", "Roll and slice"] },
        { name: "Tofu Spinach Scramble", tags: ["high-protein", "veg", "low-carb"], ingredients: ["tofu", "spinach", "onion"], steps: ["Crumble tofu", "Saute onion and spinach", "Mix tofu and season"] }
    ],
    lunch: [
        { name: "Paneer Quinoa Bowl", tags: ["high-protein", "veg"], ingredients: ["paneer", "quinoa", "capsicum"], steps: ["Cook quinoa", "Saute paneer and capsicum", "Assemble and season"] },
        { name: "Grilled Chicken Salad", tags: ["high-protein", "non-veg", "low-carb"], ingredients: ["chicken", "lettuce", "tomato"], steps: ["Grill chicken", "Chop salad vegetables", "Toss with dressing"] },
        { name: "Dal Brown Rice", tags: ["veg", "balanced"], ingredients: ["dal", "brown rice", "cumin"], steps: ["Pressure cook dal", "Cook brown rice", "Temper cumin and combine"] },
        { name: "Egg Curry Bowl", tags: ["eggetarian", "high-protein"], ingredients: ["eggs", "onion", "tomato"], steps: ["Boil and peel eggs", "Prepare curry base", "Simmer eggs in gravy"] },
        { name: "Tofu Veg Stir Fry", tags: ["veg", "low-carb"], ingredients: ["tofu", "broccoli", "garlic"], steps: ["Pan-sear tofu", "Stir-fry broccoli and garlic", "Combine and finish"] }
    ],
    dinner: [
        { name: "Millet Khichdi", tags: ["veg", "low-sugar"], ingredients: ["millet", "moong dal", "carrot"], steps: ["Rinse millet and dal", "Cook with vegetables", "Garnish and serve warm"] },
        { name: "Baked Fish and Greens", tags: ["non-veg", "high-protein", "low-carb"], ingredients: ["fish", "broccoli", "lemon"], steps: ["Season fish", "Bake fish and greens", "Finish with lemon"] },
        { name: "Paneer Veg Curry", tags: ["veg", "high-protein"], ingredients: ["paneer", "spinach", "tomato"], steps: ["Cook tomato gravy", "Add paneer cubes", "Fold in spinach and simmer"] },
        { name: "Egg Veg Scramble Plate", tags: ["eggetarian", "low-carb"], ingredients: ["eggs", "zucchini", "pepper"], steps: ["Saute zucchini and pepper", "Add whisked eggs", "Cook until fluffy"] },
        { name: "Lentil Soup Bowl", tags: ["veg", "balanced"], ingredients: ["lentils", "onion", "garlic"], steps: ["Cook lentils", "Saute onion and garlic", "Blend lightly and simmer"] }
    ]
};

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function randomFrom(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function filterMeals(meals, prefs) {
    const diet = prefs?.diet;
    const restriction = prefs?.restrictions;

    let filtered = [...meals];

    if (diet === "Veg") {
        filtered = filtered.filter((meal) => !meal.tags.includes("non-veg") && !meal.tags.includes("eggetarian"));
    } else if (diet === "Eggetarian") {
        filtered = filtered.filter((meal) => !meal.tags.includes("non-veg"));
    }

    if (restriction === "Low Sugar") {
        filtered = filtered.filter((meal) => meal.tags.includes("low-sugar") || meal.tags.includes("balanced") || meal.tags.includes("low-carb"));
    } else if (restriction === "Low Carb") {
        filtered = filtered.filter((meal) => meal.tags.includes("low-carb") || meal.tags.includes("high-protein"));
    }

    return filtered.length ? filtered : meals;
}

function generateReason(meal, prefs) {
    const reasons = [];

    if (prefs?.goal === "Muscle Gain") {
        reasons.push("High protein to support muscle gain");
    } else if (prefs?.goal === "Weight Loss") {
        reasons.push("Portion-balanced to support weight loss");
    } else {
        reasons.push("Balanced carbs for sustained energy");
    }

    if (prefs?.restrictions === "Low Sugar") {
        reasons.push("Low sugar for your dietary restriction");
    } else if (prefs?.restrictions === "Low Carb") {
        reasons.push("Low-carb profile aligned with your goal");
    }

    const userIngredients = (prefs?.ingredients || []).map(normalize);
    const shared = meal.ingredients.some((item) => userIngredients.includes(normalize(item)));
    if (shared) {
        reasons.push("Uses your available ingredients efficiently");
    }

    return randomFrom(reasons);
}

function createMeal(mealType, prefs) {
    const pool = filterMeals(mealLibrary[mealType], prefs);
    const meal = randomFrom(pool);

    return {
        name: meal.name,
        type: mealType,
        reason: generateReason(meal, prefs),
        ingredients: [...meal.ingredients],
        steps: [...meal.steps]
    };
}

function generatePlan(prefs) {
    const weeklyPlan = dayLabels.map((day) => {
        return {
            day,
            meals: {
                breakfast: createMeal("breakfast", prefs),
                lunch: createMeal("lunch", prefs),
                dinner: createMeal("dinner", prefs)
            }
        };
    });

    const todayIndex = new Date().getDay();

    const insights = [];
    if (prefs?.goal === "Muscle Gain") {
        insights.push("Balanced protein intake across the week");
    } else if (prefs?.goal === "Weight Loss") {
        insights.push("Calorie-aware meals optimized for your goal");
    } else {
        insights.push("Balanced nutrition profile for daily consistency");
    }

    if (prefs?.restrictions === "Low Carb") {
        insights.push("Low-carb meals aligned with your selected restriction");
    } else if (prefs?.restrictions === "Low Sugar") {
        insights.push("Low-sugar options prioritized in daily planning");
    } else {
        insights.push("Flexible restriction profile with broad meal variety");
    }

    const usage = computeIngredientUsage(weeklyPlan, prefs?.ingredients || []);
    insights.push(`${usage}% of meals use your available ingredients`);

    return { weeklyPlan, todayIndex, insights };
}

function computeIngredientUsage(weeklyPlan, userIngredients) {
    if (!userIngredients.length) {
        return 0;
    }

    const userSet = new Set(userIngredients.map(normalize));
    let totalMeals = 0;
    let matchedMeals = 0;

    weeklyPlan.forEach((day) => {
        ["breakfast", "lunch", "dinner"].forEach((mealType) => {
            totalMeals += 1;
            const meal = day.meals[mealType];
            const hasOverlap = meal.ingredients.some((item) => userSet.has(normalize(item)));
            if (hasOverlap) {
                matchedMeals += 1;
            }
        });
    });

    return Math.round((matchedMeals / totalMeals) * 100);
}

function computeMissingIngredients(plan, prefs) {
    if (!plan) {
        return [];
    }

    const today = plan.weeklyPlan[plan.todayIndex];
    const needed = new Set();
    const available = new Set((prefs?.ingredients || []).map(normalize));

    ["breakfast", "lunch", "dinner"].forEach((mealType) => {
        today.meals[mealType].ingredients.forEach((item) => {
            if (!available.has(normalize(item))) {
                needed.add(item);
            }
        });
    });

    return [...needed];
}

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.post("/user", (req, res) => {
    const { username, password, goal, diet, restrictions, ingredients } = req.body || {};

    if (!username || !goal || !diet || !restrictions) {
        return res.status(400).json({ error: "Missing required user fields." });
    }

    state.user = { username, password: password || "" };
    state.preferences = {
        goal,
        diet,
        restrictions,
        ingredients: Array.isArray(ingredients) ? ingredients : []
    };

    return res.json({ ok: true, user: state.user.username, preferences: state.preferences });
});

app.get("/plan", (_req, res) => {
    if (!state.preferences) {
        return res.status(400).json({ error: "User preferences not found. Please complete onboarding first." });
    }

    const plan = generatePlan(state.preferences);
    state.lastPlan = plan;
    state.todayIndex = plan.todayIndex;

    return res.json(plan);
});

app.post("/swap", (req, res) => {
    const { mealType, currentMealName, goal, diet, restrictions, ingredients } = req.body || {};

    if (!mealType || !mealLibrary[mealType]) {
        return res.status(400).json({ error: "Invalid meal type." });
    }

    const prefs = {
        goal: goal || state.preferences?.goal,
        diet: diet || state.preferences?.diet,
        restrictions: restrictions || state.preferences?.restrictions,
        ingredients: Array.isArray(ingredients) ? ingredients : state.preferences?.ingredients || []
    };

    const pool = filterMeals(mealLibrary[mealType], prefs)
        .filter((meal) => meal.name !== currentMealName)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((meal) => {
            return {
                name: meal.name,
                type: mealType,
                reason: generateReason(meal, prefs),
                ingredients: [...meal.ingredients],
                steps: [...meal.steps]
            };
        });

    return res.json({ alternatives: pool });
});

app.get("/ingredients-missing", (_req, res) => {
    if (!state.preferences || !state.lastPlan) {
        return res.status(400).json({ error: "Plan not generated yet." });
    }

    const missingIngredients = computeMissingIngredients(state.lastPlan, state.preferences);

    return res.json({
        missingIngredients,
        groceryHint: missingIngredients.length
            ? "Generate grocery list for today's meals"
            : "All required ingredients are already available"
    });
});

app.listen(PORT, () => {
    console.log(`NutriCook AI server running on http://localhost:${PORT}`);
});
