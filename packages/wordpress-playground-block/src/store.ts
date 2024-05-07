import { createReduxStore } from '@wordpress/data';

export type UploadStatus =
	| 'clean'
	| 'dirty'
	| 'uploading'
	| 'uploaded'
	| 'error';
export type PlaygroundClient = any;
export type PlaygroundClientDetails = {
	client: PlaygroundClient;
	uploadStatus: UploadStatus;
};
export type State = {
	clientsDetails: Record<string, PlaygroundClientDetails>;
};
export type SetClientAction = {
	type: 'SET_CLIENT';
	blockId: string;
	client: PlaygroundClient;
};
export type SetUploadStatusAction = {
	type: 'SET_UPLOAD_STATUS';
	blockId: string;
	status: UploadStatus;
};
export type Action = SetClientAction | SetUploadStatusAction;

const DEFAULT_STATE: State = { clientsDetails: {} };

export const store = createReduxStore('my-shop', {
	reducer(state = DEFAULT_STATE, action: Action) {
		switch (action.type) {
			case 'SET_CLIENT': {
				const prevDetails = state.clientsDetails[action.blockId];
				if (prevDetails && !action.client) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { [action.blockId]: _, ...clientsDetails } = state.clientsDetails;
					return {
						...state,
						clientsDetails,
					};
				}
				return {
					...state,
					clientsDetails: {
						...state.clientsDetails,
						[action.blockId]: {
							client: action.client,
							uploadStatus: 'clean',
						},
					},
				};
			}
		}

		return state;
	},

	actions: {
		setClient(blockId: string, client: PlaygroundClient): SetClientAction {
			return {
				type: 'SET_CLIENT',
				blockId,
				client,
			};
		},
		setUploadStatus(
			blockId: string,
			status: UploadStatus
		): SetUploadStatusAction {
			return {
				type: 'SET_UPLOAD_STATUS',
				blockId,
				status,
			};
		},
	},

	selectors: {
		getClientsDetails(state: State) {
			return state.clientsDetails;
		},
	},
});
