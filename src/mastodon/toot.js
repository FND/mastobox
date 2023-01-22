export function detoot(data) { // TODO: rename
	let { reblog } = data;
	if(reblog) {
		return {
			via: account(data.account),
			toot: detoot(reblog)
		};
	}
	return {
		id: data.id,
		url: data.url || data.uri, // XXX: why?
		author: account(data.account),
		created: data.created_at,
		edited: data.edited_at,
		content: data.content,
		media: data.media_attachments.map(att => ({
			type: att.type,
			url: att.url,
			preview: att.preview_url,
			meta: att.meta,
			description: att.description
		}))
	};
}

function account(data) {
	return {
		url: data.url || data.uri, // XXX: why?
		name: `${data.username} (${data.display_name})`,
		avatar: data.avatar
	};
}
