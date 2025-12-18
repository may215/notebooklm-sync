
// Adapters transform external webhook payloads into internal event structures
export const linear = (payload) => {
    const { action, type, data } = payload;

    // We only care about specific events for now
    if (type !== 'Issue') return null;

    let eventType = 'plan';
    let text = '';
    const title = data.title;
    const url = data.url;

    if (action === 'create') {
        eventType = 'plan-create';
        text = `Issue Created: [${data.identifier}] ${title}\n${url}`;
        if (data.description) text += `\n\n${data.description}`;
    } else if (action === 'update') {
        // Reduce noise: only track status or priority changes if needed, or major description updates
        // For MVP, capturing status changes is high value
        if (payload.updatedFrom && payload.updatedFrom.stateId) {
            eventType = 'plan-upate';
            text = `Issue Status Updated: [${data.identifier}] ${title} -> ${data.state.name}\n${url}`;
        } else {
            return null; // Ignore other updates for now
        }
    } else {
        return null;
    }

    return {
        source: 'linear',
        eventType,
        payload: {
            text,
            title,
            url,
            rawId: data.id
        }
    };
};
