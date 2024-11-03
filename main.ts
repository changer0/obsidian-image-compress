import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

import Compressor from 'image-compressor.js';
import { createInfoIcon } from 'utils';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	quality: number | undefined;//undefined
	convertSize: number;
	maxWidth: number | undefined;//Infinity
	maxHeight: number | undefined;//Infinity
	width: number | undefined;//undefined
	height: number | undefined;//undefined
	ignoredPaths: string[]; // 更新为 ignoredPaths，包含文件和目录
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	quality: 0.5,
	convertSize: 100 * 1024,//300K
	maxWidth: undefined,//Infinity
	maxHeight: undefined,//Infinity
	width: undefined,//undefined
	height: undefined,//undefined
	ignoredPaths: [], // 默认为空数组

}

export default class MyPlugin extends Plugin {
	//配置内容
	settings: MyPluginSettings;
	//当前处理的图片
	processingImage: string;

	async onload() {
		let that = this
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// https://blog.csdn.net/fangfangtulk/article/details/117958685
		this.app.workspace.onLayoutReady(() => {
			//new Notice('工作空间准备完毕!');
			log('工作空间准备完毕, 开始注册相关事件! 当前 Setting 配置: ' + JSON.stringify(this.settings));

			//注册文件创建事件
			this.registerEvent(
				this.app.vault.on('create', async (tFile) => {
					if (!(tFile instanceof TFile)) {
						return;
					}

					if (!(tFile.extension === 'png' || tFile.extension === 'jpg' || tFile.extension === 'jpeg')) {
						log('当前文件不是图片类: ' + tFile.extension);
						return;
					}

					//针对图片类型做个控制
					let imageType = tFile.extension === 'jpg' ? "jpeg" : tFile.extension

					//忽略自动生成的 Image
					if (tFile.path === this.processingImage) {
						log('此为当前处理的Image,忽略: ' + this.processingImage)
						this.processingImage = '';
						return;
					}

					this.processingImage = tFile.path;
					log('当前要处理的图片: ' + this.processingImage)

					// 检查文件路径是否在忽略列表中
					for (const ignoredPath of this.settings.ignoredPaths) {
						try {
							const regex = new RegExp(ignoredPath); // 创建正则表达式
							if (regex.test(this.processingImage)) { // 使用正则测试
								let msg = '此文件或目录被忽略: ' + this.processingImage;
								log(msg);
								new Notice(msg);
								this.processingImage = '';
								return;
							}
						} catch (e) {
							log('无效的正则表达式: ' + ignoredPath);
							new Notice('无效的正则表达式: ' + ignoredPath);
							continue; // 继续检查下一个路径
						}
					}


					//从当前的处理的图片中获取二进制数据
					const fileContentArrayBuffer: ArrayBuffer = await this.app.vault.readBinary(tFile);
					log("File Extension: " + tFile.extension)

					const blob = new Blob([fileContentArrayBuffer], { type: 'image/' + imageType });
					if (blob == null) {
						new Notice('当前处理的图片文件为空:' + this.processingImage);
						this.processingImage = '';
						return;
					}
					//原始大小
					let originSize = blob.size

					if (originSize <= this.settings.convertSize) {
						//new Notice('当前图片无需:' + this.processingImage);
						log('【' + tFile.name + '】' + '【' + formatBytes(originSize) + '】' + "当前图片无需处理😄")
						this.processingImage = '';
						return;
					}

					//log('realFile: ' + blob)
					new Compressor(blob, {
						// quality: 0.2,
						// convertSize: 100 * 1000,
						quality: this.settings.quality,
						convertSize: this.settings.convertSize,//500k,
						maxWidth: this.settings.maxWidth ? this.settings.maxWidth : Infinity,//Infinity
						maxHeight: this.settings.maxHeight ? this.settings.maxHeight : Infinity,//Infinity
						width: this.settings.width,//undefined
						height: this.settings.height,//undefined
						async success(result: Blob) {
							log('压缩成功: ' + JSON.stringify(result))
							//new Notice('压缩成功:' + JSON.stringify(result));

							let buffer = await result.arrayBuffer();
							await that.app.vault.adapter.writeBinary(tFile.path, buffer);
							//四舍五入round
							let msg = '【' + tFile.name + '】' + '压缩完成：' + formatBytes(originSize) + ' -> ' + formatBytes(result.size) + ' 🍺🍺🍺';
							log(msg)
							new Notice(msg);
							// const activeEditor = that.app.workspace.activeEditor
							// if (activeEditor) {
							// 	log('刷新当前页面!')
							// 	//好像不起作用?
							// 	activeEditor.editor?.refresh()
							// }
						},
						error(err: Error) {
							//new Notice('图片压缩失败---->>>>>', err.message)
							log('图片压缩失败: ' + JSON.stringify(err));
							new Notice('图片压缩失败: ' + JSON.stringify(err));
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
		log("保存的 Setting 文件：" + JSON.stringify(this.settings))
	}


}

/// 设置页面
class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('压缩最小值')
			.setDesc('只有超过压缩最小值才会进行压缩，注意，PNG文件超过此值将被转换为JPEG格式。')
			.addText(text => text
				.setPlaceholder('输入压缩最小值')
				.setValue(this.plugin.settings.convertSize.toString())
				.onChange(async (value) => {
					let tempValue = parseFloat(value)
					if (value !== "" && isNaN(tempValue)) {
						new Notice("参数类型不合法！")
						return;
					}

					this.plugin.settings.convertSize = value === "" ? DEFAULT_SETTINGS.convertSize : tempValue;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('图像质量')
			.setDesc('0到1之间，默认0.5，值约小，压缩得越小。')
			.addText(text => text
				.setPlaceholder('输入图像质量。')
				.setValue(this.plugin.settings.quality?.toString() ?? "")
				.onChange(async (value) => {
					let quality = parseFloat(value)
					if (value !== "" && isNaN(quality)) {
						new Notice("参数类型不合法！")
						return;
					}

					this.plugin.settings.quality = value === "" ? undefined : quality;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('最大宽度')
			.setDesc('输出图像的最大宽度，类型是 number。默认值是 Infinity（无穷大）。值应该大于0。')
			.addText(text => text
				.setPlaceholder('输入最大宽度')
				.setValue(this.plugin.settings.maxWidth?.toString() ?? "")
				.onChange(async (value) => {
					let tempValue = parseFloat(value)
					if (value !== "" && isNaN(tempValue)) {
						new Notice("参数类型不合法！")
						return;
					}
					this.plugin.settings.maxWidth = value === "" ? DEFAULT_SETTINGS.maxWidth : tempValue;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('最大高度')
			.setDesc('输出图像的最大高度，类型是 number。默认值是 Infinity（无穷大）。值应该大于0。')
			.addText(text => text
				.setPlaceholder('输入最大高度')
				.setValue(this.plugin.settings.maxHeight?.toString() ?? "")
				.onChange(async (value) => {
					let tempValue = parseFloat(value)
					if (value !== "" && isNaN(tempValue)) {
						new Notice("参数类型不合法！")
						return;
					}
					this.plugin.settings.maxHeight = value === "" ? DEFAULT_SETTINGS.maxHeight : tempValue;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('图像宽度')
			.setDesc('输出图像的宽度，类型是 number。默认值是 undefined（未定义）。值应该大于0。')
			.addText(text => text
				.setPlaceholder('输入图像宽度')
				.setValue(this.plugin.settings.width?.toString() ?? "")
				.onChange(async (value) => {
					let tempValue = parseFloat(value)
					if (value !== "" && isNaN(tempValue)) {
						new Notice("参数类型不合法！")
						return;
					}

					this.plugin.settings.width = value === "" ? DEFAULT_SETTINGS.width : tempValue;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('图像高度')
			.setDesc('输出图像的高度，类型是 number。默认值是 undefined（未定义）。值应该大于0。')
			.addText(text => text
				.setPlaceholder('输入图像宽度')
				.setValue(this.plugin.settings.height?.toString() ?? "")
				.onChange(async (value) => {
					let tempValue = parseFloat(value)
					if (value !== "" && isNaN(tempValue)) {
						new Notice("参数类型不合法！")
						return;
					}

					this.plugin.settings.height = value === "" ? DEFAULT_SETTINGS.height : tempValue;
					await this.plugin.saveSettings();
				}));


		// 忽略压缩的文件和目录
		new Setting(containerEl)
			.setName('忽略压缩的文件和目录')
			.setDesc('输入文件和目录路径，每行一个，这些将被忽略。')
			.addTextArea(text => {
				const textAreaComponent = text
					.setPlaceholder('输入要忽略的文件和目录')
					.setValue(this.plugin.settings.ignoredPaths.join('\n'))
					.onChange(async (value) => {
						this.plugin.settings.ignoredPaths = value.split('\n').map(path => path.trim());
						await this.plugin.saveSettings();
					});

				// 设置文本区域的宽度
				textAreaComponent.inputEl.style.width = '100%'; // 设置为100%宽度
				textAreaComponent.inputEl.style.minWidth = '300px'; // 可选，设置最小宽度

				// 创建包含文本区域的父容器
				const textAreaContainer = containerEl.createDiv();
				textAreaContainer.style.position = 'relative'; // 设置相对定位

				// 使用封装的函数添加提示信息图标
				const infoTitle = '支持忽略文件或文件夹，使用正则表达式匹配，每行分割。例如：\n/^.*\\.png$/\n/^directory\\/.*$/\n这些路径将不会被压缩。';
  
				const infoIcon = createInfoIcon(textAreaContainer, infoTitle);

				// 将文本区域添加到容器
				textAreaContainer.appendChild(textAreaComponent.inputEl); // 使用 inputEl 获取 DOM 元素
				textAreaContainer.appendChild(infoIcon); // 添加提示信息图标
				containerEl.appendChild(textAreaContainer);
			});


	}
}

//当前日志
function log(msg: string) {
	console.log("IMAGE_COMPRESS: " + msg)
}
//获取Byte
function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}