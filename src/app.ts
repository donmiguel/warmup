/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRESDK from '@microsoft/mixed-reality-extension-sdk';
import { TextAnchorLocation } from '@microsoft/mixed-reality-extension-sdk';


/**
 * The structure of a hat entry in the hat database.
 */
type HatDescriptor = {
	displayName: string;
	resourceName: string;
	scale: {
		x: number;
		y: number;
		z: number;
	};
	rotation: {
		x: number;
		y: number;
		z: number;
	};
	position: {
		x: number;
		y: number;
		z: number;
	};
};

/**
 * The structure of the hat database.
 */
type HatDatabase = {
	[key: string]: HatDescriptor;
};

// Load the database of hats.
// tslint:disable-next-line:no-var-requires variable-name
const HatDatabase: HatDatabase = require('../public/hats.json');

/**
 * WearAHat Application - Showcasing avatar attachments.
 */
export default class WearAHat {
	// Container for preloaded hat prefabs.
	private assets: MRESDK.AssetContainer;
	private prefabs: { [key: string]: MRESDK.Prefab } = {};
	// Container for instantiated hats.
	private attachedHats: { [key: string]: MRESDK.Actor } = {};

	/**
	 * Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param baseUrl The baseUrl to this project's `./public` folder.
	 */
	constructor(private context: MRESDK.Context, private baseUrl: string) {
		this.assets = new MRESDK.AssetContainer(context);
		// Hook the context events we're interested in.
		this.context.onStarted(() => this.started());
		this.context.onUserLeft(user => this.userLeft(user));
	}

	/**
	 * Called when a Hats application session starts up.
	 */
	private async started() {
		// Preload all the hat models.
		await this.preloadHats();
		// Show the hat menu.
		this.showHatMenu();
	}

	/**
	 * Called when a user leaves the application (probably left the Altspace world where this app is running).
	 * @param user The user that left the building.
	 */
	private userLeft(user: MRESDK.User) {
		// If the user was wearing a hat, destroy it. Otherwise it would be
		// orphaned in the world.
		if (this.attachedHats[user.id]) this.attachedHats[user.id].destroy();
		delete this.attachedHats[user.id];
	}

	/**
	 * Show a menu of hat selections.
	 */
	private showHatMenu() {
		// Create a parent object for all the menu items.
		const menu = MRESDK.Actor.Create(this.context, {});
		let y = 0.5;

		// Create menu button
		const buttonMesh = this.assets.createBoxMesh('button', 0.3, 0.3, 0.01);

		// Loop over the hat database, creating a menu item for each entry.
		/*
		for (const hatId of Object.keys(HatDatabase)) {
			// Create a clickable button.
			const button = MRESDK.Actor.Create(this.context, {
				actor: {
					parentId: menu.id,
					name: hatId,
					appearance: { meshId: buttonMesh.id },
					collider: { geometry: { shape: 'auto' } },
					transform: {
						local: { position: { x: 0, y, z: 0 } }
					}
				}
			});

			// Set a click handler on the button.
			button.setBehavior(MRESDK.ButtonBehavior)
				.onClick(user => this.wearHat(hatId, user.id));

			// Create a label for the menu entry.
			MRESDK.Actor.Create(this.context, {
				actor: {
					parentId: menu.id,
					name: 'label',
					text: {
						contents: HatDatabase[hatId].displayName,
						height: 0.5,
						anchor: MRESDK.TextAnchorLocation.MiddleLeft
					},
					transform: {
						local: { position: { x: 0.5, y, z: 0 } }
					}
				}
			});
			y = y + 0.5;
		}
		*/

		// Create a clickable button.
		const button = MRESDK.Actor.Create(this.context, {
			actor: {
				parentId: menu.id,
				name: "Get a card",
				appearance: { meshId: buttonMesh.id },
				collider: { geometry: { shape: 'auto' } },
				transform: {
					local: { position: { x: 0, y, z: 0 },
					scale: { x: 2, y: 2, z: 2 } },
				}
			}
		});

		// Set a click handler on the button.
		button.setBehavior(MRESDK.ButtonBehavior)
			.onClick(user => this.wearHat(user.id));

		// Create a label for the menu entry.
		MRESDK.Actor.Create(this.context, {
			actor: {
				parentId: menu.id,
				name: 'label',
				text: {
					contents: "Get a card",
					height: 0.5,
					anchor: MRESDK.TextAnchorLocation.MiddleLeft
				},
				transform: {
					local: { position: { x: 0.7, y, z: 0 } }
				}
			}
		});

		// Create a label for the menu title.
		MRESDK.Actor.Create(this.context, {
			actor: {
				parentId: menu.id,
				name: 'label',
				text: {
					contents: ''.padStart(8, ' ') + "Play 'Who am I'",
					height: 0.8,
					anchor: MRESDK.TextAnchorLocation.MiddleCenter,
					color: MRESDK.Color3.Yellow()
				},
				transform: {
					local: { position: { x: 0.5, y: y + 1.25, z: 0 } }
				}
			}
		});
	}

	/**
	 * Preload all hat resources. This makes instantiating them faster and more efficient.
	 */
	private preloadHats() {
		// Loop over the hat database, preloading each hat resource.
		// Return a promise of all the in-progress load promises. This
		// allows the caller to wait until all hats are done preloading
		// before continuing.
		return Promise.all(
			Object.keys(HatDatabase).map(hatId => {
				const hatRecord = HatDatabase[hatId];
				if (hatRecord.resourceName) {
					return this.assets.loadGltf(
						`${this.baseUrl}/${hatRecord.resourceName}`)
						.then(assets => {
							this.prefabs[hatId] = assets.find(a => a.prefab !== null) as MRESDK.Prefab;
						})
						.catch(e => console.error(e));
				} else {
					return Promise.resolve();
				}
			}));
	}

	/**
	 * Instantiate a hat and attach it to the avatar's head.
	 * @param hatId The id of the hat in the hat database.
	 * @param userId The id of the user we will attach the hat to.
	 */
	private wearHat(userId: string) {
		// If the user is wearing a hat, destroy it.
		if (this.attachedHats[userId]) {
			this.attachedHats[userId].destroy();
			delete this.attachedHats[userId];
			return;	
		}

		//const hatRecord = HatDatabase[hatId];
		//get a random name from the list
		const nameList = ['asdf', 'asdf', 'Snow White', 'Snoopy', 'Scooby Doo', 
		'John Wayne', 'Anne Hathaway', 'Duke Ellington', 'Madonna', 'Superman', 
		'Batman', 'Robin', 'George Washington', 'Abraham Lincoln', 'Thomas Edison',
		'Benjamin Franklin', 'Brittany Spears', 'Cinderella', 'Sleeping Beauty', 'Billy Joel', 
		'Albert Einstein', 'Richard Nixon', 'Arnold Schwarzenegger', 'Dora the Explorer', 
		'Elmo/Big Bird', 'Howard Stern', 'Donald Trump', 'Rosie O’Donnell', 'Oprah Winfrey', 
		'Helen of Troy', 'Helen Keller', 'Cleopatra', 'Queen Elizabeth', 'Demi Moore', 'Angelina Jolie', 'Bill Clinton', 
		'Hillary Clinton', 'Bill Cosby', 'George Clooney', 'Rachael Ray', 
		'Martha Stewart', 'Magic Johnson', 'Dennis Miller', 'Michael Jackson', 'Brad Pitt', 'John Lennon', 'Elvis', 
		'Tom Sawyer', 'Napoleon', 'Cleopatra', 'Joan of Arc', 'SpongeBob', 'Ellen DeGeneres', 'Simon Cowell', 'George Bush'];

		const num = Math.floor(Math.random() * (nameList.length + 1));

		this.attachedHats[userId] = MRESDK.Actor.Create(this.context, {
			actor: {
				name: 'Text',
				transform: {
					app: { 
						position: { x: 0, y: 0.5, z: 0 } ,
						rotation: { w: 0, x: 0, y: -1, z: 0 }
					}
				},
				text: {
					contents: nameList[num], //"Mona Lisa",
					anchor: TextAnchorLocation.MiddleCenter,
					color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
					height: 0.3
				},
				attachment: {
					attachPoint: 'head',
					userId
				}
				//exclusiveToUser: userId
			}
		});
	}
}
