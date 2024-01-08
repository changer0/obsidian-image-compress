import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

import Compressor from 'image-compressor.js';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	//配置内容
	settings: MyPluginSettings;
	//当前
	curHandleImage: String;
	
	async onload() {
		let that = this
		await this.loadSettings();
	
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
		
		// https://blog.csdn.net/fangfangtulk/article/details/117958685
		this.app.workspace.onLayoutReady(() => {
			//new Notice('工作空间准备完毕!');
			console.log("工作空间准备完毕, 开始注册相关事件!");
			
			//注册文件创建事件
			this.registerEvent(
				this.app.vault.on('create', async (tFile) => {
					if (!(tFile instanceof TFile) || tFile.name === 'new.png') {
						return;
					}
			
					const fileContentArrayBuffer: ArrayBuffer = await this.app.vault.readBinary(tFile);
					const blob = new Blob([fileContentArrayBuffer], {type: 'image/*'});
					if (blob == null) {
						new Notice("文件为空");
						return;
					}

					console.log("realFile: " + blob)
 					new Compressor(blob, {
						quality:0.5,
						convertSize: 100 * 1024,//100k,
						maxWidth: 100,
						maxHeight: 100,
						async success(result: Blob) {
							console.log("压缩成功: " + JSON.stringify(result))
							new Notice("压缩成功:" + result);

							let buffer = await result.arrayBuffer()
							await that.app.vault.adapter.writeBinary('new.png', buffer)
						},
						error(err: Error) {
							//new Notice('图片压缩失败---->>>>>', err.message)
							console.log("图片压缩失败: " + err)
						}
					})
			
				})
			);
		})




	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
	}


}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
					
				}));
	}
}
