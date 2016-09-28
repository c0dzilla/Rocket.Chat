Meteor.startup(function() {
	RocketChat.settings.add('Message_AllowSnippeting', true, {
		type: "boolean",
		public: true,
		group: 'Message'
    });
	RocketChat.models.Permissions.upsert('snippet-message', {
		$setOnInsert: {
			roles: ['owner', 'moderator', 'admin']
		}
	});
});

