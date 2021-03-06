import { google } from 'googleapis';
import Future from 'fibers/future';

Meteor.methods({
	async 'fetchFileFromDrive'(file) {
		const future = new Future();
		const driveScope = 'https://www.googleapis.com/auth/drive';

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid User', { method: 'fetchFileFromDrive' });
		}

		const id = Meteor.userId();
		const user = RocketChat.models.Users.findOne({ _id: id });

		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid User', { method: 'fetchFileFromDrive' });
		}

		if (!RocketChat.settings.get('Accounts_OAuth_Google')) {
			throw new Meteor.Error('error-google-unavailable', 'Google Services Unavailable', { method: 'fetchFileFromDrive' });
		}

		if (!user.services.google) {
			throw new Meteor.Error('error-unauthenticated-user', 'Unauthenticated User', { method: 'fetchFileFromDrive' });
		}

		const client = {
			clientId: RocketChat.settings.get('Accounts_OAuth_Google_id'),
			clientSecret: RocketChat.settings.get('Accounts_OAuth_Google_secret'),
			calllbackUrl: RocketChat.settings.get('Accounts_OAuth_Google_callback_url'),
			credentials: {
				token: user.services.google.accessToken,
				refreshToken: user.services.google.refreshToken,
				scopes: user.services.google.scope,
				expiresAt: user.services.google.expiresAt,
			},
		};

		if (!client.credentials.token || !client.credentials.scopes || client.credentials.scopes.indexOf(driveScope) === -1 || client.credentials.expiresAt < Date.now() + 60 * 1000) {
			throw new Meteor.Error('error-unauthenticated-user', 'Unauthenticated User', { method: 'fetchFileFromDrive' });
		}

		const authObj = new google.auth.OAuth2(client.clientId, client.clientSecret, client.calllbackUrl);

		authObj.credentials = {
			access_token: client.credentials.token,
			refresh_token: client.credentials.refreshToken,
		};

		const drive = google.drive({
			version: 'v3',
			auth: authObj,
		});

		if (!file.mimeType.match(/application\/vnd\.google-apps\./i)) {
			await drive.files.get({
				fileId: file.id,
				alt: 'media',
			}, {
				responseType: 'arraybuffer',
			}, function(err, response) {
				if (err) {
					future.return({ success: false, data: [] });
					return;
				}

				const arrayBuffer = response.data;
				const byteArray = new Uint8Array(arrayBuffer);
				future.return({ success: true, data: byteArray });
			});
		} else {
			await drive.files.export({
				fileId: file.id,
				mimeType: 'application/pdf',
			}, {
				responseType: 'arraybuffer',
			}, function(err, response) {
				if (err) {
					future.return({ success: false, data: [] });
					return;
				}
				const arrayBuffer = response.data;
				const byteArray = new Uint8Array(arrayBuffer);
				future.return({ success: true, data: byteArray });
			});
		}

		return future.wait();
	},
});
