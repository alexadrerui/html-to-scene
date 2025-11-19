import { FoundryVTTInterface } from './FoundryVTTInterface.js';
import { ModuleSettings } from '../modules/modulesettings.js';
import { ModuleInfo } from '../core.js';
import { HTMLToSceneHelpers } from '../modules/modulehelpers.js';

/**
 *  HTML To Scene static class
 *
 * @class HTMLToScene
 */

class HTMLToScene {
	/** Global Vars */

	static FoundryVTTAccess;
	static HTMLAccess;

	static _diceSoNiceInstalled = false;
	static _updateInterval;
	static _refreshingInterval;
	static _iFrameNode;
	static _oldBottomStatus = 1;
	static _oldLeftStatus = 6;
	static _lastSceneWasHTML = false;
	static _localJQuery;
	// Foundry VTT v13: Store captured form data for saving
	static _capturedFormData = null;
	static _capturedSceneId = null;

	/** @type {String} */
	static get fileLocation() {
		return '';
	}

	static get htmltosceneReadyMacro() {
		return '';
	}

	static get iframeReadyMacro() {
		return '';
	}

	static get iframeUpdatedMacro() {
		return '';
	}

	/** @type {Boolean} */
	static get minimalUI() {
		return true;
	}

	static get forceSceneChanger() {
		return true;
	}

	static get forcePlayerList() {
		return false;
	}

	static get respectRightControls() {
		return true;
	}

	static get disableRightControls() {
		return false;
	}

	static get disableGamePausedStatus() {
		return false;
	}

	static get disableSmallTime() {
		return false;
	}

	static get disableBoard() {
		return false;
	}

	static get assistedBidirectionalAccess() {
		return false;
	}

	static get autoMacros() {
		return false;
	}

	static get showFoundryLogo() {
		return game.settings.get(ModuleInfo.moduleid, 'showFoundryLogo');
	}

	/** @type {Number} */
	static get lowerUISettings() {
		return 0;
	}

	static get allowedRateOfAccess() {
		return 0;
	}

	static get iFrameRefreshingRate() {
		return 0;
	}

	/** @type {Object} */
	static get flags() {
		return canvas.scene?.flags || {};
	}

	/** Getters **/

	/* Booleans */
	static get enabled() {
		return Boolean(this.flags.htmltoscene?.enable);
	}

	static get minUI() {
		return Boolean(this.flags.htmltoscene?.minUI ?? this.minimalUI);
	}

	static get keepTop() {
		return Boolean(this.flags.htmltoscene?.keepTop ?? this.forceSceneChanger);
	}

	static get keepPlayerList() {
		return Boolean(
			this.flags.htmltoscene?.keepPlayerList ?? this.forcePlayerList
		);
	}

	static get spaceRight() {
		return Boolean(
			this.flags.htmltoscene?.spaceRight ?? this.respectRightControls
		);
	}

	static get rightDisabled() {
		return Boolean(
			this.flags.htmltoscene?.rightDisabled ?? this.disableRightControls
		);
	}

	static get hidePaused() {
		return Boolean(
			this.flags.htmltoscene?.hidePaused ?? this.disableGamePausedStatus
		);
	}

	static get hideSmallTime() {
		return Boolean(
			this.flags.htmltoscene?.hideSmallTime ?? this.disableSmallTime
		);
	}

	static get hideBoard() {
		return Boolean(this.flags.htmltoscene?.hideBoard ?? this.disableBoard);
	}

	static get passData() {
		return Boolean(
			this.flags.htmltoscene?.passData ?? this.assistedBidirectionalAccess
		);
	}

	static get autoMacrosEnabled() {
		return Boolean(
			this.flags.htmltoscene?.autoMacrosEnabled ?? this.autoMacros
		);
	}

	/* Numbers */

	static get keepBottomControls() {
		return Number(
			this.flags.htmltoscene?.keepBottomControls ?? this.lowerUISettings
		);
	}

	static get dataUpdateRate() {
		return Number(
			this.flags.htmltoscene?.dataUpdateRate ?? this.allowedRateOfAccess
		);
	}

	static get iFrameRefreshRate() {
		return Number(
			this.flags.htmltoscene?.iFrameRefreshRate ?? this.iFrameRefreshingRate
		);
	}

	/* Strings */

	static get fileLoc() {
		return String(this.flags.htmltoscene?.fileLoc ?? this.fileLocation);
	}

	static get selfReadyMacroName() {
		return String(
			this.flags.htmltoscene?.selfReadyMacroName ?? this.htmltosceneReadyMacro
		);
	}

	static get iframeReadyMacroName() {
		return String(
			this.flags.htmltoscene?.iframeReadyMacroName ?? this.iframeReadyMacro
		);
	}

	static get iframeUpdatedMacroName() {
		return String(
			this.flags.htmltoscene?.iframeUpdatedMacroName ?? this.iframeUpdatedMacro
		);
	}

	static init(...args) {
		loadTemplates(['modules/html-to-scene/templates/sceneSettings.html']);
		ModuleSettings.registerSettings();
		console.log(ModuleInfo.moduleprefix + 'Loaded');
	}

	static replace(...args) {
		if (!this.enabled) {
			this.restoreUI();
			this._lastSceneWasHTML = false;
			//this.saveUIStatus();
			return;
		}
		this._lastSceneWasHTML = true;
		this.stopActiveIntervals();
		this.setUI(); //Sets FoundryVTT's UI as needed.

		//Deleting previous iframe
		if (this._iFrameNode != null) document.body.removeChild(this._iFrameNode);

		var canvasHeight = '100vh';
		var canvasWidth = '';

		// Foundry VTT v13: Always use full viewport dimensions for iframe
		// Only calculate width if explicitly respecting sidebar space AND sidebar is visible
		if (this.spaceRight == true && !this.rightDisabled) {
			// If respecting sidebar space, calculate width minus sidebar
			canvasWidth = this.calcSpacedWidth() + 'px';
		} else {
			// Always use full viewport width - iframe will be behind UI elements
			canvasWidth = '100vw';
		}

		console.log(
			ModuleInfo.moduleprefix +
				'Replacing canvas with responsive height and ' +
				(canvasWidth == '100%' ? 'width' : 'non responsive width')
		);

		//Checking for diceSoNice, then putting the iframe before if that is the case.
		if (!this._diceSoNiceInstalled) {
			document.body.insertBefore(
				this.createIframe(canvasHeight, canvasWidth),
				document.getElementById('pause')
			);
		} else {
			document.body.insertBefore(
				this.createIframe(canvasHeight, canvasWidth),
				document.getElementById('dice-box-canvas')
			);
		}

		Hooks.call('htmlToSceneReady', this);

		if (this.passData) {
			this.passDataToIFrame(); //Adds FoundryVTT variables to the iframe
		}

		if (this.iFrameRefreshRate > 0) {
			this._refreshingInterval = setInterval(() => {
				this.refreshIFrame();
			}, this.iFrameRefreshRate);
		}
	}

	/**
	 * Hides or shows FoundryVTT UI elements depending on user preferences for the scene.
	 *
	 * @param  {...any} args
	 */
	static setUI(...args) {
		//TODO Test how it works with themes. Might have to store the previous state. (It's supposed to be stored thanks to jQuery)
		if (!this._lastSceneWasHTML) {
			//Stores the bottom UI starting status from a page where the module was inactive.
			this._oldBottomStatus = this.getBottomStatus();
			this._oldLeftStatus = this.getLeftStatus();
		}
		//Here the redundancy is important, in the case of the user changes options in the same scene. Learned the hard way.
		if (this.minUI == true) {
			this.setLeftStatus(0);
			this.setBottomStatus(0);
			if (this.rightDisabled) {
				this.nodeVisibility($('#ui-right')[0], 'hidden');
				this.nodeVisibility($('#ui-top')[0], 'visible');
			} else {
				this.nodeVisibility($('#ui-top')[0], 'hidden');
				this.nodeVisibility($('#ui-right')[0], 'visible');
			}
		} else {
			this.setLeftStatus(this._oldLeftStatus);
			this.setBottomStatus(this._oldBottomStatus);
			this.nodeVisibility($('#ui-top')[0], 'visible');
			if (this.rightDisabled) {
				this.nodeVisibility($('#ui-right')[0], 'hidden');
			} else {
				this.nodeVisibility($('#ui-right')[0], 'visible');
			}
		}

		if (this.hidePaused == true) {
			this.nodeVisibility($('#pause')[0], 'hidden');
		} else {
			if (game.paused) {
				//To prevent the game paused indicator to reappear on other scene.
				this.nodeVisibility($('#pause')[0], 'visible');
			}
		}

		if (this.keepTop == true) this.nodeVisibility($('#ui-top')[0], 'visible');

		if (this.keepPlayerList == true) {
			this.nodeVisibility($('#ui-left')[0], 'visible');
			this.setLeftStatus(7);
		}

		this.nodeVisibility($('#ui-bottom')[0], 'visible');
		this.setBottomStatus(this.keepBottomControls);

		//This uses jQuery's .hide() and .show() that work like display:none and display:whateverwasbefore
		// Foundry VTT v13: Check if element exists before calling jQuery methods
		const boardEl = $('#board');
		if (boardEl.length) {
			if (this.hideBoard == true) {
				boardEl.hide();
			} else {
				boardEl.show();
			}
		}

		this.updateSmallTime();
	}
	/**
	 * Shows back FoundryVTT UI elements.
	 *
	 * @param  {...any} args
	 */
	//TODO Test how it works with themes. Might have to store the previous state.
	static restoreUI(...args) {
		console.log(ModuleInfo.moduleprefix + 'Restoring FoundryVTT features...');

		//Checking if the iframe still exists, and deleting it in that case.
		if (this._iFrameNode != null) document.body.removeChild(this._iFrameNode);
		this._iFrameNode = null; //Deleting iframe reference.
		//Empties references
		this.FoundryVTTAccess = null;
		this.HTMLAccess = null;

		//Restoring FoundryVTT's UI, this might not work with UI modifications.
		this.nodeVisibility($('#ui-left')[0], 'visible');
		this.nodeVisibility($('#ui-bottom')[0], 'visible');
		this.nodeVisibility($('#hotbar')[0], 'visible');
		this.nodeVisibility($('#ui-top')[0], 'visible');
		this.nodeVisibility($('#ui-right')[0], 'visible');
		if (game.paused) {
			//To prevent the game paused indicator to reappear on other scene.
			this.nodeVisibility($('#pause')[0], 'visible');
		}
		// Foundry VTT v13: Check if elements exist before calling jQuery methods
		if ($('#board').length) $('#board').show();
		if ($('#smalltime-app').length) $('#smalltime-app').show();

		this.stopActiveIntervals();
		this.setBottomStatus(this._oldBottomStatus);
		this.setLeftStatus(this._oldLeftStatus);
	}

	/**
	 *
	 * @returns Width of the screen in pixels minus the width of the right controls
	 */
	static calcSpacedWidth() {
		// Foundry VTT v13: Calculate width accounting for sidebar
		let rightControlsElement = document.getElementById('ui-right');
		if (!rightControlsElement) {
			// If sidebar doesn't exist, use full width
			return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
		}
		let widthUImod = rightControlsElement.offsetWidth || 0;
		return (
			(window.innerWidth ||
				document.documentElement.clientWidth ||
				document.body.clientWidth) - widthUImod
		);
	}

	/**
	 * Updates iframe's dimensions in the only case where it isn't responsive on the canvasPan hook (Triggered on a window size change).
	 */
	static updateDimensions() {
		if (!this.enabled || !this._iFrameNode) return;
		
		const iframe = document.getElementById(ModuleInfo.moduleapp);
		if (!iframe) return;
		
		// Foundry VTT v13: Update dimensions based on settings
		// Use inset properties to ensure full coverage
		iframe.style.left = '0';
		iframe.style.top = '0';
		iframe.style.right = '0';
		iframe.style.bottom = '0';
		
		// Only calculate width if explicitly respecting sidebar space AND sidebar is visible
		if (this.spaceRight && !this.rightDisabled) {
			// If respecting sidebar, calculate width
			const width = this.calcSpacedWidth();
			iframe.style.width = width + 'px';
			iframe.style.right = 'auto'; // Override right to respect calculated width
		} else {
			// Always use full viewport - iframe behind UI elements
			iframe.style.width = '100vw';
			iframe.style.minWidth = '100vw';
		}
		iframe.style.height = '100vh';
		iframe.style.minHeight = '100vh';
	}

	/**
	 * Updates paused status after load.
	 */
	static pauseControl() {
		if (this.enabled) {
			if (game.paused) {
				//To prevent the game paused indicator to reappear on other scene.
				this.nodeVisibility($('#pause')[0], 'visible');
			} else {
				this.nodeVisibility($('#pause')[0], 'hidden');
			}
		}
	}

	/**
	 * Creates and returns a iframe node with a given height and width.
	 *
	 * @param {String} height
	 * @param {String} width
	 * @returns
	 */
	static createIframe(height, width) {
		var ifrm = document.createElement('iframe');
		ifrm.setAttribute('src', this.fileLoc);
		ifrm.setAttribute('id', ModuleInfo.moduleapp);
		ifrm.setAttribute('frameBorder', '0');
		ifrm.frameborder = 0;
		// Foundry VTT v13: Use CSS styles for proper sizing
		// Position fixed to cover entire viewport, z-index above canvas but below UI elements
		ifrm.style.position = 'fixed';
		ifrm.style.left = '0';
		ifrm.style.top = '0';
		ifrm.style.right = '0';
		ifrm.style.bottom = '0';
		// Use explicit width/height as fallback, but inset properties ensure full coverage
		ifrm.style.width = width;
		ifrm.style.height = height;
		// Use min-width and min-height to ensure it covers everything
		ifrm.style.minWidth = '100vw';
		ifrm.style.minHeight = '100vh';
		// Use z-index above canvas (typically 1-5) but below UI elements (typically 100+)
		// This ensures iframe is visible but UI elements remain clickable
		ifrm.style.zIndex = '10';
		ifrm.style.border = 'none';
		ifrm.style.outline = 'none';
		ifrm.style.margin = '0';
		ifrm.style.padding = '0';
		ifrm.style.pointerEvents = 'auto';
		ifrm.style.boxSizing = 'border-box';
		this._iFrameNode = ifrm;
		return this._iFrameNode;
	}

	/* Scene configuration code */

	/**
	 * Handles the renderSceneConfig Hook
	 *
	 * Injects HTML into the scene config.
	 * @param {SceneConfig} sceneConfig
	 * @param {HTMLElement} html - Foundry VTT v13: Now HTMLElement instead of jQuery
	 * @param {Object} data
	 */

	static async renderSceneConfig(sceneConfig, html, data) {
		// Foundry VTT v13: html is now HTMLElement, not jQuery
		// In v13, html is a FORM element with class 'sheet scene-config'
		
		// Try multiple strategies to find where to insert the tab
		// First, try to find the ambience tab specifically
		let targetItem = html.querySelector('.item[data-tab="ambience"]');
		let targetTab = html.querySelector('.tab[data-tab="ambience"]');
		
		// If not found, try to find any tab navigation structure within the form
		if (!targetItem) {
			// Look for tab navigation in header or nav elements
			const header = html.querySelector('header.window-header');
			const tabsNav = header?.querySelector('nav.tabs') || html.querySelector('nav.tabs, .window-header nav');
			if (tabsNav) {
				// Find the last item in the tabs navigation
				const items = tabsNav.querySelectorAll('.item, [data-tab]');
				if (items.length > 0) {
					targetItem = items[items.length - 1];
				}
			}
		}
		
		if (!targetTab) {
			// Look for tab content area - usually after header or in a content div
			const contentArea = html.querySelector('.window-content, .sheet-content, .tab-container');
			if (contentArea) {
				const tabs = contentArea.querySelectorAll('.tab, [data-tab].tab');
				if (tabs.length > 0) {
					targetTab = tabs[tabs.length - 1];
				}
			}
		}

		// Fallback: try to find any tab item within the form structure
		if (!targetItem) {
			// Search within the form for tab navigation
			const header = html.querySelector('header');
			if (header) {
				const tabsNav = header.querySelector('nav');
				if (tabsNav) {
					const items = tabsNav.querySelectorAll('.item, [data-tab]');
					if (items.length > 0) {
						targetItem = items[items.length - 1];
					}
				}
			}
			
			// If still not found, search more broadly
			if (!targetItem) {
				const allItems = html.querySelectorAll('.item[data-tab], nav .item');
				if (allItems.length > 0) {
					targetItem = allItems[allItems.length - 1];
				}
			}
		}

		if (!targetTab) {
			// Search for tab content within window-content or similar
			const windowContent = html.querySelector('.window-content');
			if (windowContent) {
				const tabs = windowContent.querySelectorAll('.tab[data-tab], [data-tab]');
				if (tabs.length > 0) {
					targetTab = tabs[tabs.length - 1];
				}
			}
			
			// If still not found, search more broadly
			if (!targetTab) {
				const allTabs = html.querySelectorAll('.tab[data-tab], [data-tab].tab');
				if (allTabs.length > 0) {
					targetTab = allTabs[allTabs.length - 1];
				}
			}
		}

		// Fallback: try finding by navigation or tabs container
		if (!targetItem) {
			const tabsNav = html.querySelector('nav.tabs, .tabs, [data-tab-container]');
			if (tabsNav) {
				// Try to find the last item in the nav
				const navItems = tabsNav.querySelectorAll('.item');
				if (navItems.length > 0) {
					targetItem = navItems[navItems.length - 1];
				}
			}
		}

		if (!targetTab) {
			const tabsContent = html.querySelector('.tab[data-tab], .sheet-body, [data-tab-content]');
			if (tabsContent) {
				const contentTabs = tabsContent.querySelectorAll('.tab');
				if (contentTabs.length > 0) {
					targetTab = contentTabs[contentTabs.length - 1];
				}
			}
		}

		if (!targetItem || !targetTab) {
			console.warn(ModuleInfo.moduleprefix + 'Could not find tab elements, attempting alternative insertion');
			// Last resort: try to find tabs navigation and content area separately
			// Search in the html element itself first, then try searching in document if html is not the root
			let tabsNav = html.querySelector('nav.tabs, .tabs, [role="tablist"]');
			let tabsContent = html.querySelector('.sheet-content, .sheet-body, [data-tab-content]');
			
			// If not found, try searching from the parent or the document
			if (!tabsNav || !tabsContent) {
				const parent = html.parentElement;
				if (parent) {
					tabsNav = tabsNav || parent.querySelector('nav.tabs, .tabs, [role="tablist"]');
					tabsContent = tabsContent || parent.querySelector('.sheet-content, .sheet-body, [data-tab-content]');
				}
				// Try document search as last resort
				if (!tabsNav || !tabsContent) {
					const sceneSheet = document.querySelector('.scene-config, .sheet.scene-config, [data-appid*="scene"]');
					if (sceneSheet) {
						tabsNav = tabsNav || sceneSheet.querySelector('nav.tabs, .tabs, [role="tablist"]');
						tabsContent = tabsContent || sceneSheet.querySelector('.sheet-content, .sheet-body, [data-tab-content]');
					}
				}
			}
			
			if (tabsNav && tabsContent) {
				// Find any existing item to insert after
				const existingItems = tabsNav.querySelectorAll('.item, [data-tab]');
				if (existingItems.length > 0) {
					existingItems[existingItems.length - 1].insertAdjacentHTML(
						'afterend',
						`<a class="item" data-tab="htmltoscene"><i class="fas fa-file-code"></i> ${game.i18n.localize(
							'htmltoscene.modulename'
						)}</a>`
					);
				} else {
					// Insert at the end of nav
					tabsNav.insertAdjacentHTML(
						'beforeend',
						`<a class="item" data-tab="htmltoscene"><i class="fas fa-file-code"></i> ${game.i18n.localize(
							'htmltoscene.modulename'
						)}</a>`
					);
				}

				// Insert tab content
				let sceneTemplateData = await this.getSceneTemplateData(data, sceneConfig);
				const tabContent = await this.getSceneHtml(sceneTemplateData);
				
				// Find any existing tab to insert after
				const existingTabs = tabsContent.querySelectorAll('.tab, [data-tab]');
				if (existingTabs.length > 0) {
					existingTabs[existingTabs.length - 1].insertAdjacentHTML('afterend', tabContent);
				} else {
					// Insert at the end of content
					tabsContent.insertAdjacentHTML('beforeend', tabContent);
				}
				return;
			} else {
				// Final fallback: Foundry VTT v13 structure - FORM with header.window-header and div.window-content
				console.warn(ModuleInfo.moduleprefix + 'Attempting direct insertion using Foundry VTT v13 structure');
				
				const header = html.querySelector('header.window-header');
				const windowContent = html.querySelector('div.window-content');
				
				if (header && windowContent) {
					// Find or create nav element in header
					let nav = header.querySelector('nav');
					if (!nav) {
						// Create nav element if it doesn't exist
						nav = document.createElement('nav');
						nav.className = 'tabs';
						// Try to insert nav before the window title or at the end of header
						const title = header.querySelector('h4.window-title');
						if (title) {
							title.insertAdjacentElement('afterend', nav);
						} else {
							header.appendChild(nav);
						}
					}
					
					// Find last item in nav or insert at end
					const navItems = nav.querySelectorAll('.item, [data-tab]');
					if (navItems.length > 0) {
						navItems[navItems.length - 1].insertAdjacentHTML('afterend', 
							`<a class="item" data-tab="htmltoscene"><i class="fas fa-file-code"></i> ${game.i18n.localize('htmltoscene.modulename')}</a>`
						);
					} else {
						nav.insertAdjacentHTML('beforeend', 
							`<a class="item" data-tab="htmltoscene"><i class="fas fa-file-code"></i> ${game.i18n.localize('htmltoscene.modulename')}</a>`
						);
					}
					
					// Insert tab content in window-content
					let sceneTemplateData = await this.getSceneTemplateData(data, sceneConfig);
					const tabContent = await this.getSceneHtml(sceneTemplateData);
					
					// Find last tab or insert at end of window-content
					const existingTabs = windowContent.querySelectorAll('.tab, [data-tab]');
					if (existingTabs.length > 0) {
						existingTabs[existingTabs.length - 1].insertAdjacentHTML('afterend', tabContent);
					} else {
						windowContent.insertAdjacentHTML('beforeend', tabContent);
					}
					return;
				}
				
				console.error(ModuleInfo.moduleprefix + 'Could not find header.window-header or div.window-content');
				console.error(ModuleInfo.moduleprefix + 'HTML element details:', {
					tagName: html?.tagName,
					className: html?.className,
					id: html?.id,
					children: html?.children?.length || 0,
					hasHeader: !!html.querySelector('header'),
					hasWindowContent: !!html.querySelector('.window-content'),
					innerHTMLPreview: html?.innerHTML?.substring(0, 500)
				});
				return;
			}
		}

		// Insert tab button after target tab button
		targetItem.insertAdjacentHTML(
			'afterend',
			`<a class="item" data-tab="htmltoscene"><i class="fas fa-file-code"></i> ${game.i18n.localize(
				'htmltoscene.modulename'
			)}</a>`
		);

		// Insert tab content after target tab content
		let sceneTemplateData = await this.getSceneTemplateData(data, sceneConfig);
		const tabContent = await this.getSceneHtml(sceneTemplateData);
		targetTab.insertAdjacentHTML('afterend', tabContent);

		// Foundry VTT v13: Activate tabs system for the new tab
		// Wait a bit for the DOM to be ready, then activate tabs
		setTimeout(() => {
			const newTabButton = html.querySelector('.item[data-tab="htmltoscene"]');
			const newTabContent = html.querySelector('.tab[data-tab="htmltoscene"]');
			
			if (newTabButton && newTabContent) {
				// Ensure tab content is initially hidden (like other tabs)
				newTabContent.style.display = 'none';
				
				// Helper function to show our tab
				// Only show ours, don't hide others - let Foundry manage them
				const showOurTab = () => {
					// Just show our tab and mark button as active
					// Don't touch other tabs - Foundry will handle them
					newTabContent.style.display = 'block';
					newTabButton.classList.add('active');
				};
				
				// Handle click on our tab button - minimal interference
				const handleOurTabClick = (event) => {
					// Only prevent default if it's our tab
					if (event.target.closest('.item[data-tab="htmltoscene"]')) {
						event.preventDefault();
						event.stopPropagation();
						
						// Use requestAnimationFrame to ensure this runs after any Foundry handlers
						requestAnimationFrame(() => {
							// Hide all tabs first (including Foundry's)
							const allTabs = html.querySelectorAll('.tab[data-tab]');
							for (let i = 0; i < allTabs.length; i++) {
								allTabs[i].style.display = 'none';
							}
							
							// Remove active from all buttons
							const allTabButtons = html.querySelectorAll('.item[data-tab]');
							for (let i = 0; i < allTabButtons.length; i++) {
								allTabButtons[i].classList.remove('active');
							}
							
							// Show our tab
							showOurTab();
						});
					}
				};

				// Add click handler to our tab button only
				newTabButton.addEventListener('click', handleOurTabClick, { capture: true });
				
				// Use MutationObserver to watch for tab changes on other tabs
				// This ensures our tab is hidden when others are clicked
				// We only react to changes, we don't interfere with Foundry's tab management
				const observer = new MutationObserver(() => {
					// Check which tab is currently active
					const activeTabButton = html.querySelector('.item[data-tab].active');
					
					if (activeTabButton === newTabButton) {
						// Our tab is active - just ensure it's shown
						// Don't hide other tabs here - that's handled in the click handler
						if (newTabContent.style.display !== 'block') {
							newTabContent.style.display = 'block';
						}
					} else if (activeTabButton && activeTabButton.dataset.tab !== 'htmltoscene') {
						// Another tab is active - hide ours
						// Foundry will handle showing the clicked tab, we just hide ours
						if (newTabContent.style.display !== 'none') {
							newTabContent.style.display = 'none';
						}
						// Also ensure our button is not active
						if (newTabButton.classList.contains('active')) {
							newTabButton.classList.remove('active');
						}
					}
				});
				
				// Observe changes to tab buttons
				const tabsNav = html.querySelector('nav.tabs, .tabs, [role="tablist"]');
				
				if (tabsNav) {
					observer.observe(tabsNav, {
						attributes: true,
						attributeFilter: ['class'],
						subtree: true
					});
				}
				
				// Initial check
				setTimeout(() => {
					const activeTabButton = html.querySelector('.item[data-tab].active');
					if (activeTabButton === newTabButton) {
						showOurTab();
					}
				}, 50);

				// Foundry VTT v13: Setup checkbox sync functions
				// Performance: Get tabContent once and cache all selectors
				const tabContentForSync = newTabContent; // Reuse already queried element
				
				// Performance: Cache selectors to avoid repeated queries
				let cachedEnabledOnly = null;
				let cachedMinUIOnly = null;
				let cachedAutoMacrosSection = null;
				let cachedDataUpdateRate = null;
				
				const getEnabledOnly = () => {
					if (!cachedEnabledOnly) {
						cachedEnabledOnly = tabContentForSync.querySelectorAll('.htmltosceneEnabledOnly');
					}
					return cachedEnabledOnly;
				};
				
				const getMinUIOnly = () => {
					if (!cachedMinUIOnly) {
						cachedMinUIOnly = tabContentForSync.querySelectorAll('.htmltosceneMinUIOnly');
					}
					return cachedMinUIOnly;
				};
				
				const getAutoMacrosSection = () => {
					if (!cachedAutoMacrosSection) {
						cachedAutoMacrosSection = tabContentForSync.querySelector('.htmltosceneAutoMacros');
					}
					return cachedAutoMacrosSection;
				};
				
				const getDataUpdateRate = () => {
					if (!cachedDataUpdateRate) {
						cachedDataUpdateRate = tabContentForSync.querySelector('#dataUpdateRateID');
					}
					return cachedDataUpdateRate;
				};
				
				// Function to sync enabled state (optimized)
				const syncEnabled = (cb) => {
					const syncTargets = getEnabledOnly();
					const checked = cb.checked;
					for (let i = 0; i < syncTargets.length; i++) {
						syncTargets[i].disabled = !checked;
					}
				};
				
				// Function to sync minUI state (optimized)
				const syncMinUI = (cb) => {
					const syncTargets = getMinUIOnly();
					const checked = cb.checked;
					for (let i = 0; i < syncTargets.length; i++) {
						syncTargets[i].disabled = !checked;
					}
				};
				
				// Function to sync passData state (optimized)
				const syncPassData = (cb) => {
					const syncTarget = getDataUpdateRate();
					if (syncTarget) {
						syncTarget.disabled = !cb.checked;
					}
				};
				
				// Function to sync autoMacros visibility (optimized)
				const syncAutoMacros = (cb) => {
					const autoMacrosSection = getAutoMacrosSection();
					if (autoMacrosSection) {
						autoMacrosSection.style.display = cb.checked ? 'flex' : 'none';
					}
				};
				
				// Performance: Use event delegation instead of individual listeners
				// This reduces memory usage and improves performance
				tabContentForSync.addEventListener('change', (event) => {
					const checkbox = event.target;
					if (checkbox.type === 'checkbox' && checkbox.hasAttribute('data-sync')) {
						const syncType = checkbox.getAttribute('data-sync');
						switch(syncType) {
							case 'enabled':
								syncEnabled(checkbox);
								break;
							case 'minUI':
								syncMinUI(checkbox);
								break;
							case 'passData':
								syncPassData(checkbox);
								break;
							case 'autoMacros':
								syncAutoMacros(checkbox);
								break;
						}
					}
				});
				
				// Initialize autoMacros visibility
				const autoMacrosCB = tabContentForSync.querySelector('#htmltosceneAutoMacrosCB');
				if (autoMacrosCB) {
					const autoMacrosSection = getAutoMacrosSection();
					if (autoMacrosSection) {
						autoMacrosSection.style.display = autoMacrosCB.checked ? 'flex' : 'none';
					}
				}
				
				// Foundry VTT v13: Apply CSS styles to ensure proper layout and scrolling
				// Performance: Use requestAnimationFrame for smooth DOM updates
				const applyTabStyles = () => {
					if (!tabContentForSync) return;
					
					// Use requestAnimationFrame to batch DOM updates
					requestAnimationFrame(() => {
						// Apply styles to the tab content to ensure proper scrolling
						tabContentForSync.style.maxHeight = 'calc(100vh - 200px)';
						tabContentForSync.style.overflowY = 'auto';
						tabContentForSync.style.overflowX = 'hidden';
						tabContentForSync.style.paddingBottom = '60px';
						tabContentForSync.style.boxSizing = 'border-box';
						
						// Batch DOM reads and writes for better performance
						const formGroups = tabContentForSync.querySelectorAll('.form-group');
						const sectionHeaders = tabContentForSync.querySelectorAll('.section-header');
						const hrElements = tabContentForSync.querySelectorAll('hr, .section-divider');
						const notes = tabContentForSync.querySelectorAll('.notes');
						const autoMacrosSection = getAutoMacrosSection();
						const warningNote = tabContentForSync.querySelector('.warning-note');
						
						// Apply styles using for loops (faster than forEach)
						for (let i = 0; i < formGroups.length; i++) {
							if (!formGroups[i].style.marginBottom) {
								formGroups[i].style.marginBottom = '0.5em';
							}
						}
						
						for (let i = 0; i < sectionHeaders.length; i++) {
							const header = sectionHeaders[i];
							header.style.textAlign = 'center';
							header.style.fontWeight = 'bold';
							header.style.marginTop = '1em';
							header.style.marginBottom = '0.5em';
							header.style.padding = '0.5em 0';
							header.style.color = 'var(--color-text-heading, #4b4a44)';
						}
						
						for (let i = 0; i < hrElements.length; i++) {
							const hr = hrElements[i];
							hr.style.margin = '0.75em 0';
							hr.style.border = 'none';
							hr.style.borderTop = '1px solid rgba(0, 0, 0, 0.2)';
							hr.style.width = '100%';
						}
						
						for (let i = 0; i < notes.length; i++) {
							if (!notes[i].style.marginBottom) {
								notes[i].style.marginBottom = '0.25em';
							}
						}
						
						if (autoMacrosSection) {
							autoMacrosSection.style.display = 'flex';
							autoMacrosSection.style.flexDirection = 'column';
							autoMacrosSection.style.marginTop = '0.5em';
							autoMacrosSection.style.padding = '0.75em';
							autoMacrosSection.style.border = '1px solid rgba(0, 0, 0, 0.1)';
							autoMacrosSection.style.borderRadius = '3px';
							autoMacrosSection.style.background = 'rgba(0, 0, 0, 0.02)';
							
							const formFields = autoMacrosSection.querySelectorAll('.form-fields');
							const autoMacrosInputs = autoMacrosSection.querySelectorAll('input[type="text"]');
							const srOnlyLabels = autoMacrosSection.querySelectorAll('.sr-only');
							
							for (let i = 0; i < formFields.length; i++) {
								formFields[i].style.display = 'flex';
								formFields[i].style.flexDirection = 'column';
								formFields[i].style.gap = '0.5em';
								formFields[i].style.width = '100%';
							}
							
							for (let i = 0; i < autoMacrosInputs.length; i++) {
								autoMacrosInputs[i].style.width = '100%';
								autoMacrosInputs[i].style.boxSizing = 'border-box';
							}
							
							// Screen reader only labels (visually hidden but accessible)
							for (let i = 0; i < srOnlyLabels.length; i++) {
								srOnlyLabels[i].style.position = 'absolute';
								srOnlyLabels[i].style.width = '1px';
								srOnlyLabels[i].style.height = '1px';
								srOnlyLabels[i].style.padding = '0';
								srOnlyLabels[i].style.margin = '-1px';
								srOnlyLabels[i].style.overflow = 'hidden';
								srOnlyLabels[i].style.clip = 'rect(0, 0, 0, 0)';
								srOnlyLabels[i].style.whiteSpace = 'nowrap';
								srOnlyLabels[i].style.borderWidth = '0';
							}
						}
						
						if (warningNote) {
							warningNote.style.fontStyle = 'italic';
							warningNote.style.color = '#8b4513';
							warningNote.style.marginTop = '1em';
							warningNote.style.padding = '0.5em';
							warningNote.style.background = 'rgba(139, 69, 19, 0.1)';
							warningNote.style.borderLeft = '3px solid #8b4513';
							warningNote.style.borderRadius = '2px';
						}
					});
				};
				
				// Apply styles after DOM is ready (single timeout instead of multiple)
				setTimeout(applyTabStyles, 150);

				// Foundry VTT v13: Override _getSubmitData to capture all form values
				if (sceneConfig?.app) {
					const originalGetSubmitData = sceneConfig.app._getSubmitData;
					if (originalGetSubmitData) {
						sceneConfig.app._getSubmitData = function(...args) {
							const submitData = originalGetSubmitData.apply(this, args);
							
							// Capture all form values from htmltoscene tab, including disabled fields
							// Use the same tabContent reference to avoid duplicate query
							if (tabContentForSync) {
								if (!submitData.flags) {
									submitData.flags = {};
								}
								if (!submitData.flags.htmltoscene) {
									submitData.flags.htmltoscene = {};
								}

								const allInputs = tabContentForSync.querySelectorAll('input, select, textarea');
								allInputs.forEach(input => {
									const name = input.getAttribute('name');
									if (name && name.startsWith('flags.htmltoscene.')) {
										const key = name.replace('flags.htmltoscene.', '');
										let value;

										// Get value based on input type
										if (input.type === 'checkbox') {
											value = input.checked;
										} else if (input.tagName === 'SELECT') {
											value = input.value;
											const dtype = input.getAttribute('data-dtype');
											if (dtype === 'Number') {
												value = Number(value) || 0;
											}
										} else {
											value = input.value || '';
											const dtype = input.getAttribute('data-dtype');
											if (dtype === 'Number') {
												value = Number(value) || 0;
											} else if (dtype === 'Boolean') {
												value = value === 'true' || value === true || input.checked;
											}
										}

										// Always set the value, even if field is disabled
										submitData.flags.htmltoscene[key] = value;
									}
								});
							}
							
							return submitData;
						};
					}
				}
			}
		}, 100);

		//Filepicker
		/*$('#html-picker').click(() => {
			const fp = new FilePicker({
				type: 'any',
				button: 'html-picker',
				title: 'Select a HTML file',
				callback: (url) => {
					console.log(url);
				},
			});
			fp.browse();
		});*/
	}

	/**
	 * Retrieves the current data for the scene being configured.
	 *
	 * @static
	 * @param {object} data - The data being passed to the scene config template
	 * @return {HTMLToSceneSettings}
	 * @memberof HTMLToScene
	 */
	static getSceneTemplateData(hookData, sceneConfig) {
		// Foundry VTT v13: Try multiple ways to get flags
		let flags = null;
		if (sceneConfig?.object) {
			flags = sceneConfig.object.flags?.htmltoscene;
		} else if (hookData?.data?.flags) {
			flags = hookData.data.flags.htmltoscene;
		} else if (hookData?.flags) {
			flags = hookData.flags.htmltoscene;
		}

		const data = flags || {
			enable: false,
			fileLoc: '',
			minUI: true,
			spaceRight: true,
			rightDisabled: false,
			hidePaused: false,
		};

		// Ensure required fields have default values if not present
		data.keepBottomControls = data.keepBottomControls ?? 0;
		data.dataUpdateRate = data.dataUpdateRate ?? 0;
		data.iFrameRefreshRate = data.iFrameRefreshRate ?? 0;

		// Foundry VTT v13: Prepare selectOptions data for {{selectOptions}} helper
		data.keepBottomControlsOptions = [
			{ value: 0, label: game.i18n.localize('htmltoscene.scenesettings.keepBottomControls.values.defaultnone') },
			{ value: 1, label: game.i18n.localize('htmltoscene.scenesettings.keepBottomControls.values.macrobaronly') },
			{ value: 2, label: game.i18n.localize('htmltoscene.scenesettings.keepBottomControls.values.camerasonly') },
			{ value: 3, label: game.i18n.localize('htmltoscene.scenesettings.keepBottomControls.values.both') },
			{ value: 4, label: game.i18n.localize('htmltoscene.scenesettings.keepBottomControls.values.macroplusfps') },
			{ value: 5, label: game.i18n.localize('htmltoscene.scenesettings.keepBottomControls.values.cameraplusfps') },
			{ value: 6, label: game.i18n.localize('htmltoscene.scenesettings.keepBottomControls.values.bothplusfps') },
			{ value: 7, label: game.i18n.localize('htmltoscene.scenesettings.keepBottomControls.values.fpsonly') }
		];

		data.dataUpdateRateOptions = [
			{ value: 0, label: game.i18n.localize('htmltoscene.scenesettings.dataUpdateRate.values.default') },
			{ value: 1, label: game.i18n.localize('htmltoscene.scenesettings.dataUpdateRate.values.fivesec') },
			{ value: 2, label: game.i18n.localize('htmltoscene.scenesettings.dataUpdateRate.values.onesec') },
			{ value: 3, label: game.i18n.localize('htmltoscene.scenesettings.dataUpdateRate.values.halfsec') },
			{ value: 4, label: game.i18n.localize('htmltoscene.scenesettings.dataUpdateRate.values.cuarterofasec') },
			{ value: 5, label: game.i18n.localize('htmltoscene.scenesettings.dataUpdateRate.values.realtime') }
		];

		data.iFrameRefreshRateOptions = [
			{ value: 0, label: game.i18n.localize('htmltoscene.scenesettings.iFrameRefreshRate.values.defaultnone') },
			{ value: 60000, label: game.i18n.localize('htmltoscene.scenesettings.iFrameRefreshRate.values.oneminute') },
			{ value: 30000, label: game.i18n.localize('htmltoscene.scenesettings.iFrameRefreshRate.values.thirtyseconds') },
			{ value: 15000, label: game.i18n.localize('htmltoscene.scenesettings.iFrameRefreshRate.values.fifteenseconds') },
			{ value: 10000, label: game.i18n.localize('htmltoscene.scenesettings.iFrameRefreshRate.values.tenseconds') },
			{ value: 5000, label: game.i18n.localize('htmltoscene.scenesettings.iFrameRefreshRate.values.fiveseconds') }
		];

		return data;
	}

	/**
	 * Prepares scene update data to ensure all form values are saved
	 * even when fields are disabled (Foundry VTT v13 fix)
	 *
	 * @static
	 * @param {Scene} scene - The scene being updated
	 * @param {Object} updateData - The update data object
	 * @memberof HTMLToScene
	 */
	/**
	 * Captures form data from scene config before window closes
	 * (Foundry VTT v13 fix for disabled fields not being saved)
	 *
	 * @static
	 * @param {SceneConfig} app - The scene config application
	 * @param {HTMLElement} html - The HTML element
	 * @memberof HTMLToScene
	 */
	static captureFormData(app, html) {
		// Foundry VTT v13: Read all form values, including disabled fields
		// html may be undefined in v13, try to get it from app if available
		if (!html && app?.element) {
			html = app.element[0] || app.element;
		}
		if (!html) {
			return; // Cannot capture data without HTML element
		}
		
		const tabContent = html.querySelector('.tab[data-tab="htmltoscene"]');
		if (!tabContent) return;

		// Get all inputs in the htmltoscene tab
		const allInputs = tabContent.querySelectorAll('input, select, textarea');
		const formData = {};

		allInputs.forEach(input => {
			const name = input.getAttribute('name');
			if (name && name.startsWith('flags.htmltoscene.')) {
				let value;

				// Get value based on input type
				if (input.type === 'checkbox') {
					value = input.checked;
				} else if (input.tagName === 'SELECT') {
					value = input.value;
					const dtype = input.getAttribute('data-dtype');
					if (dtype === 'Number') {
						value = Number(value);
					}
				} else {
					value = input.value || '';
					const dtype = input.getAttribute('data-dtype');
					if (dtype === 'Number') {
						value = Number(value) || 0;
					} else if (dtype === 'Boolean') {
						value = value === 'true' || value === true;
					}
				}

				// Store the value
				const key = name.replace('flags.htmltoscene.', '');
				formData[key] = value;
			}
		});

		// Store captured data for use in preUpdateScene
		if (app?.object && Object.keys(formData).length > 0) {
			this._capturedFormData = formData;
			this._capturedSceneId = app.object.id;
		}
	}

	/**
	 * Prepares scene update data to ensure all form values are saved
	 * even when fields are disabled (Foundry VTT v13 fix)
	 *
	 * @static
	 * @param {Scene} scene - The scene being updated
	 * @param {Object} updateData - The update data object
	 * @memberof HTMLToScene
	 */
	static prepareSceneUpdate(scene, updateData) {
		// Foundry VTT v13: Ensure htmltoscene flags are preserved
		// Use captured form data if available
		if (this._capturedSceneId === scene.id && this._capturedFormData) {
			if (!updateData.flags) {
				updateData.flags = {};
			}
			if (!updateData.flags.htmltoscene) {
				updateData.flags.htmltoscene = {};
			}

			// Merge captured data with update data
			updateData.flags.htmltoscene = {
				...this._capturedFormData,
				...updateData.flags.htmltoscene,
				// Ensure captured data takes precedence
				...this._capturedFormData
			};

			// Clear captured data after use
			this._capturedFormData = null;
			this._capturedSceneId = null;
		} else if (updateData && updateData.flags) {
			if (!updateData.flags.htmltoscene) {
				// Preserve existing flags if not being updated
				const currentFlags = scene.flags?.htmltoscene || {};
				if (Object.keys(currentFlags).length > 0) {
					updateData.flags.htmltoscene = currentFlags;
				}
			} else {
				// Merge existing flags with update data to preserve values not in form
				const currentFlags = scene.flags?.htmltoscene || {};
				updateData.flags.htmltoscene = {
					...currentFlags,
					...updateData.flags.htmltoscene
				};
			}
		}
	}

	/**
	 * Fills the template with correct values.
	 *
	 * @param {HTMLToSceneSettings} settings
	 */
	static async getSceneHtml(settings) {
		// Foundry VTT v13: renderTemplate is now namespaced
		if (foundry?.applications?.handlebars?.renderTemplate) {
			return await foundry.applications.handlebars.renderTemplate(
				'modules/html-to-scene/templates/sceneSettings.html',
				settings
			);
		} else {
			// Fallback for older versions
			return await renderTemplate(
				'modules/html-to-scene/templates/sceneSettings.html',
				settings
			);
		}
	}

	/* Scene configuration END */

	/* Module compatibility hooks */

	/**
	 * Changes iframe position to one before the nodeID given.
	 * @param {HTML Node's ID} nodeID
	 */
	static swapPosition(nodeID) {
		//Checking if the iframe still exists, and deleting it in that case.
		//Doing it visually doesn't cause a iFrame reload.
		var otherNode = document.getElementById(nodeID);
		if (otherNode != null && typeof otherNode == 'htmlelement') {
			let otherZIndex = getComputedStyle(otherNode).getPropertyValue('z-index');
			getComputedStyle(this._iFrameNode).setProperty(
				'z-index',
				otherZIndex - 1
			);
		}
	}

	/**
	 * Updates SmallTime with module preferences when loaded
	 */
	static updateSmallTime() {
		// Foundry VTT v13: Check if element exists before calling jQuery methods
		const smallTimeEl = $('#smalltime-app');
		if (smallTimeEl.length) {
			if (this.hideSmallTime == true && this.enabled) {
				smallTimeEl.hide();
			} else {
				smallTimeEl.show();
			}
		}
	}

	/* Module compatibility hooks END */

	/* Control Handling */

	/**
	 * Updates Scene controls (this is needed on a scene change)
	 */
	static updateSceneControls() {
		if (this.enabled) {
			if (this.keepPlayerList == true) {
				this.nodeVisibility($('#ui-left')[0], 'visible');
				this.setLeftStatus(7);
			} else {
				if (this.minUI) {
					this.setLeftStatus(0);
				} else {
					this.setLeftStatus(this._oldLeftStatus);
				}
			}
			if (this.minUI) {
				this.nodeVisibility($('#ui-bottom')[0], 'visible');
				this.setBottomStatus(this.keepBottomControls);
			} else {
				this.setBottomStatus(this._oldBottomStatus);
			}
		}
	}

	/**
	 * Get bottom ui's status and returns it.
	 *
	 * @returns {Number} between 0 and 7.
	 */
	static getBottomStatus() {
		let status = 0;
		let hotbar = this.isDOMNodeShown($('#hotbar')[0]);
		let camera = this.isDOMNodeShown($('#camera-views')[0]);
		let fps = this.isDOMNodeShown($('#fps')[0]);
		status = hotbar + camera * 2 + fps * 3;

		if (hotbar + camera == 0 && status == 3) status = 7; //Special status to show only the FPS
		return status;
	}

	/**
	 * Sets the bottom UI due the variable
	 *
	 * @param {bottomStatus} needs a number between 0 and 7
	 */
	static setBottomStatus(bottomStatus) {
		switch (bottomStatus) {
			case 0:
				this.nodeVisibility($('#hotbar')[0], 'hidden');
				this.nodeVisibility($('#camera-views')[0], 'hidden');
				this.nodeVisibility($('#fps')[0], 'hidden');
				break;
			case 1:
				this.nodeVisibility($('#hotbar')[0], 'visible');
				this.nodeVisibility($('#camera-views')[0], 'hidden');
				this.nodeVisibility($('#fps')[0], 'hidden');
				break;
			case 2:
				this.nodeVisibility($('#hotbar')[0], 'hidden');
				this.nodeVisibility($('#camera-views')[0], 'visible');
				this.nodeVisibility($('#fps')[0], 'hidden');
				break;
			case 3:
				this.nodeVisibility($('#hotbar')[0], 'visible');
				this.nodeVisibility($('#camera-views')[0], 'visible');
				this.nodeVisibility($('#fps')[0], 'hidden');
				break;
			case 4:
				this.nodeVisibility($('#hotbar')[0], 'visible');
				this.nodeVisibility($('#camera-views')[0], 'hidden');
				this.nodeVisibility($('#fps')[0], 'visible');
				break;
			case 5:
				this.nodeVisibility($('#hotbar')[0], 'hidden');
				this.nodeVisibility($('#camera-views')[0], 'visible');
				this.nodeVisibility($('#fps')[0], 'visible');
				break;
			case 6:
				this.nodeVisibility($('#hotbar')[0], 'visible');
				this.nodeVisibility($('#camera-views')[0], 'visible');
				this.nodeVisibility($('#fps')[0], 'visible');
				break;
			case 7:
				this.nodeVisibility($('#hotbar')[0], 'hidden');
				this.nodeVisibility($('#camera-views')[0], 'hidden');
				this.nodeVisibility($('#fps')[0], 'visible');
				break;
		}
	}

	/**
	 * Get left ui's status and returns it.
	 *
	 * @returns {Number} between 0 and 7.
	 */
	static getLeftStatus() {
		let status = 0;
		let logo = this.isDOMNodeShown($('#logo')[0]);
		let controls = this.isDOMNodeShown($('#controls')[0]);
		let players = this.isDOMNodeShown($('#players')[0]);
		status = logo + controls * 2 + players * 3;

		if (logo + controls == 0 && players == 3) status = 7; //Special status to show only the players
		return status;
	}

	/**
	 * Sets the bottom UI due the variable
	 *
	 * @param {leftStatus} needs a number between 0 and 7
	 */
	static setLeftStatus(leftStatus) {
		switch (leftStatus) {
			case 0:
				this.nodeVisibility($('#logo')[0], 'hidden');
				this.nodeVisibility($('#controls')[0], 'hidden');
				this.nodeVisibility($('#players')[0], 'hidden');
				break;
			case 1:
				this.nodeVisibility($('#logo')[0], 'visible');
				this.nodeVisibility($('#controls')[0], 'hidden');
				this.nodeVisibility($('#players')[0], 'hidden');
				break;
			case 2:
				this.nodeVisibility($('#logo')[0], 'hidden');
				this.nodeVisibility($('#controls')[0], 'visible');
				this.nodeVisibility($('#players')[0], 'hidden');
				break;
			case 3:
				this.nodeVisibility($('#logo')[0], 'visible');
				this.nodeVisibility($('#controls')[0], 'visible');
				this.nodeVisibility($('#players')[0], 'hidden');
				break;
			case 4:
				this.nodeVisibility($('#logo')[0], 'visible');
				this.nodeVisibility($('#controls')[0], 'hidden');
				this.nodeVisibility($('#players')[0], 'visible');
				break;
			case 5:
				this.nodeVisibility($('#logo')[0], 'hidden');
				this.nodeVisibility($('#controls')[0], 'visible');
				this.nodeVisibility($('#players')[0], 'visible');
				break;
			case 6:
				this.nodeVisibility($('#logo')[0], 'visible');
				this.nodeVisibility($('#controls')[0], 'visible');
				this.nodeVisibility($('#players')[0], 'visible');
				break;
			case 7:
				this.nodeVisibility($('#logo')[0], 'hidden');
				this.nodeVisibility($('#controls')[0], 'hidden');
				this.nodeVisibility($('#players')[0], 'visible');
				break;
		}
	}

	/**
	 * Checks element's visibility
	 * @param {HTMLElement} el
	 * @returns Boolean
	 */
	static isDOMNodeShown(el) {
		// Foundry VTT v13: Check if element exists before accessing style
		if (!el || !el.style) {
			return false;
		}
		return el.style.visibility != 'hidden' ? true : false;
	}

	/**
	 * Stores current status as the old (Called in renderSceneControls' hook)
	 */
	static saveUIStatus() {
		this._oldLeftStatus = this.getLeftStatus();
		this._oldBottomStatus = this.getBottomStatus();
	}

	/* Control Handling END */

	/* Data passing */

	/**
	 * Makes syncing an external HTML file and FoundryVTT somewhat easier.
	 * You could implement this in a cheaper way doing it in a barebones way doing the references yourself.
	 * But in some cases, injecting an object to an iframe could be useful. Ex: https://docs.godotengine.org/en/stable/classes/class_javascriptobject.html#class-javascriptobject
	 *
	 * This essentially uses two global unused objects on ../core.js: FoundryVTTAccess and HTMLAccess
	 * HTMLAccess is intended to for within Foundry, enabling direct modification of the iFrame (using <iframe>.contentWindow)
	 * Similarly, FoundryVTTAccess is intended to use in an HTML file, enabling you to use the full Foundry API, the 'game' variable and some helpers from the HTML file.
	 * FoundryVTTAccess doesn't interface everything, neither tries to. It only interfaces things that aren't canvas related (because that will be replaced).
	 *
	 * Also, it handles the update rate of FoundryVTTAccess. (Doing it in the bare-bones way would be equivalent to using it in real-time, and you wouldn't have to use a promise in your file)
	 *
	 * The main idea behind this is to lower the barrier to entry. Being able to be used with knowledge, and basic html/css/js, but in the right hands it could be very powerful.
	 */
	static passDataToIFrame() {
		//Throwing some foundry variables to the iframe
		console.log(ModuleInfo.moduleprefix + 'Passing FoundryVTT variables...');

		let updateMs = this.getUpdateRateInMs();
		this.FoundryVTTAccess = FoundryVTTInterface;
		this._iFrameNode.contentWindow.FoundryVTT = this.FoundryVTTAccess;

		//Setting the Updates
		if (updateMs >= 0 && !this.fileLoc.startsWith('http')) {
			this._updateInterval = setInterval(() => {
				this._iFrameNode.contentWindow.FoundryVTT = this.FoundryVTTAccess;
			}, updateMs);
		}

		if (HTMLToScene.debugMode()) {
			window.FoundryVTTAccess = this.FoundryVTTAccess;
		}
	}

	static htmlAccessSetter() {
		this.HTMLAccess = this._iFrameNode.contentWindow.document;
		window.HTMLAccess = this.HTMLAccess; //Injecting it for macro usage
	}

	/**
	 * @returns The time in Ms that was selected in the dataUpdateRate setting
	 */
	static getUpdateRateInMs() {
		let updateMs;
		switch (this.dataUpdateRate) {
			case 1:
				updateMs = 5000;
				break;
			case 2:
				updateMs = 1000;
				break;
			case 3:
				updateMs = 500;
				break;
			case 4:
				updateMs = 250;
				break;
			case 5:
				updateMs = 10; //All web browsers have a capped minimum to not overload people's computers. Just in case, I left it at 10ms. No so much real-time for you!
				break;
			default:
				updateMs = -1;
				break;
		}
		return updateMs;
	}

	/* Data passing END */

	/* AutoMacros */

	static htmlToSceneReadyMacro() {
		if (this.enabled && this.autoMacrosEnabled) {
			(async () => {
				while (!window.hasOwnProperty('HTMLAccess'))
					await new Promise((resolve) => setTimeout(resolve, 10));
				HTMLToSceneHelpers.runMacroByName(this.selfReadyMacroName);
			})();
		}
	}

	static htmlToSceneIFrameReadyMacro() {
		if (this.enabled && this.autoMacrosEnabled)
			(async () => {
				while (!window.hasOwnProperty('HTMLAccess'))
					await new Promise((resolve) => setTimeout(resolve, 10));
				HTMLToSceneHelpers.runMacroByName(this.iframeReadyMacroName);
			})();
	}

	static htmlToSceneIFrameUpdatedMacro() {
		if (this.enabled && this.autoMacrosEnabled)
			(async () => {
				while (!window.hasOwnProperty('HTMLAccess'))
					await new Promise((resolve) => setTimeout(resolve, 10));
				HTMLToSceneHelpers.runMacroByName(this.iframeUpdatedMacroName);
			})();
	}

	/* AutoMacros END */

	/* Misc */

	/**
	 * Stops active intervals used by the module
	 */
	static stopActiveIntervals() {
		clearInterval(this._updateInterval);
		clearInterval(this._refreshingInterval);
	}

	/**
	 * Forces a IFrame refresh
	 */
	static refreshIFrame() {
		console.log(ModuleInfo.moduleprefix + 'Refreshing IFrame...');
		let iframe = document.getElementById(ModuleInfo.moduleapp);
		if (iframe) {
			iframe.src = iframe.src;
		}
	}

	/**
	 * Visibility Helper
	 * @param {HTMLElement} DOMNode
	 * @param {String} visibility
	 */
	static nodeVisibility(DOMNode, visibility) {
		// Foundry VTT v13: Check if element exists before accessing style
		if (!DOMNode || !DOMNode.style) {
			return;
		}

		if (
			DOMNode === '#logo' &&
			visibility === 'visible' &&
			!this.showFoundryLogo()
		)
			return; //showFoundryLogo setting
		if (visibility == 'visible' || visibility == 'hidden') {
			DOMNode.style.visibility = visibility;
		} else if (visibility == 'toggle') {
			DOMNode.visibility = () => {
				return DOMNode.style.visibility == 'visible' ? 'hidden' : 'visible';
			};
		}
	}

	// Debug mode, returns true if active
	static debugMode() {
		if (game.user.name == 'debug' || CONFIG.debug.moduleDebug) {
			CONFIG.debug.hooks = true;
			window.HTMLToScene = this; //Exposes class to the javascript console on the browser
			return true;
		} else {
			return false;
		}
	}

	/* Misc END */
}

export { HTMLToScene };
