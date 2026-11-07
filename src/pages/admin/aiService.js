
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000")
    .replace(/\/+$/, "");

function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        ""
    );
}

export class AINotConnectedError extends Error {
    constructor(message = "AI backend is not connected.") {
        super(message);
        this.name = "AINotConnectedError";
    }
}

async function requestAI({ action, prompt, canvas, image, width, height }) {
    const token = getToken();

    if (!token) {
        throw new Error("Your SchoolOS login has expired. Please log in again.");
    }

    let response;

    if (action === "edit") {
        const form = new FormData();
        form.append("action", "edit");
        form.append("prompt", prompt);
        form.append("image", image, "design-image.png");
        form.append("width", String(width || 1024));
        form.append("height", String(height || 1024));

        response = await fetch(`${API_URL}/api/ai-creative`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
    } else {
        response = await fetch(`${API_URL}/api/ai-creative`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action,
                prompt,
                canvas: canvas || {},
            }),
        });
    }

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("The AI server returned an unreadable response.");
    }

    if (!response.ok || data.success === false) {
        if (response.status === 401) {
            throw new Error("Your login has expired. Please log in again.");
        }

        throw new Error(
            data.error || data.message || `AI request failed (${response.status}).`
        );
    }

    return data;
}

function dataUrlToFile(dataUrl, filename = "design-image.png") {
    const [header, base64] = dataUrl.split(",");
    if (!header || !base64) throw new Error("The selected image is invalid.");

    const mime = header.match(/data:(.*?);base64/)?.[1] || "image/png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new File([bytes], filename, { type: mime });
}

async function imageUrlToFile(src) {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Could not read the selected image.");

    const blob = await response.blob();
    return new File([blob], "design-image.png", {
        type: blob.type || "image/png",
    });
}

export const aiService = {
    async generateDesigns(payload) {
        const data = await requestAI({
            action: "generate",
            prompt: payload.prompt,
            canvas: payload.size,
        });

        return {
            designPlan: data.design_plan,
            artwork: data.artwork,
            modelsUsed: data.models_used,
        };
    },

    async createTextPlan(prompt, canvas) {
        return requestAI({
            action: "text",
            prompt,
            canvas,
        });
    },

    async regenerate({ design, instruction }) {
        const data = await requestAI({
            action: "generate",
            prompt: [
                "Create a new visual version of this existing design.",
                `Existing design: ${design.name || "Untitled design"}.`,
                `Existing text: ${design.elements
                    .filter((e) => e.type === "text")
                    .map((e) => e.text)
                    .join(" | ")}`,
                instruction || "Keep the same message but improve the visual treatment.",
            ].join("\n"),
            canvas: { width: design.width, height: design.height },
        });

        return data;
    },

    async redesign({ design, instruction }) {
        return this.regenerate({
            design,
            instruction:
                instruction || "Create a substantially different professional layout.",
        });
    },

    async improveDesign({ design, instruction }) {
        const data = await requestAI({
            action: "text",
            prompt: [
                "Improve this existing design while preserving its original message.",
                `Design name: ${design.name || "Untitled"}.`,
                `Text: ${design.elements
                    .filter((e) => e.type === "text")
                    .map((e) => e.text)
                    .join(" | ")}`,
                `Instructions: ${instruction || "Improve hierarchy, spacing, typography and clarity."}`,
                "Return a professional design plan.",
            ].join("\n"),
            canvas: { width: design.width, height: design.height },
        });

        return { design_plan: data.design_plan };
    },

    async replaceImage({ design, elementId, instruction }) {
        const element = design.elements.find((e) => e.id === elementId);

        if (!element?.src) {
            throw new Error("Upload or select an image before editing it.");
        }

        const image = await imageUrlToFile(element.src);

        const data = await requestAI({
            action: "edit",
            prompt: instruction || "Improve this image for a professional school poster.",
            image,
            width: Math.min(1024, design.width),
            height: Math.min(1024, design.height),
        });

        if (!data.edited_image) {
            throw new Error("The AI did not return an edited image.");
        }

        return { src: data.edited_image };
    },
};
