// background.js

function createContextMenu() {
    chrome.contextMenus.create({
        id: "notebooklm-save",
        title: "Save to NotebookLM",
        contexts: ["selection"]
    });
}

chrome.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "notebooklm-save" && info.selectionText) {
        const projectId = "chrome-research"; // In a real app, this would be configurable via popup
        const payload = {
            userId: "browser-user",
            projectId: projectId,
            source: "browser",
            eventType: "clip",
            timestamp: Date.now(),
            payload: {
                title: tab.title,
                url: tab.url,
                text: info.selectionText
            }
        };

        try {
            const response = await fetch("http://localhost:8787/v1/events", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log("Saved to NotebookLM extension!");
            } else {
                console.error("Failed to save:", response.status);
            }
        } catch (error) {
            console.error("Error connecting to NotebookLM Sync API:", error);
        }
    }
});
