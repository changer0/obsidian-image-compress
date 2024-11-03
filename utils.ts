// 封装提示图标的创建逻辑
export function createInfoIcon(container: HTMLElement, title: string) {
    const infoIcon = container.createEl('span', { text: '?' });
    infoIcon.style.cursor = 'pointer';
    infoIcon.style.position = 'absolute'; // 绝对定位
    infoIcon.style.right = '10px'; // 距离右边10px
    infoIcon.style.top = '10px'; // 距离顶部10px
    infoIcon.style.width = '20px'; // 设置宽度
    infoIcon.style.height = '20px'; // 设置高度
    infoIcon.style.borderRadius = '50%'; // 圆形
    infoIcon.style.backgroundColor = '#f0f0f0'; // 圆形背景色
    infoIcon.style.display = 'flex'; // 使用 flexbox 对齐
    infoIcon.style.alignItems = 'center'; // 垂直居中
    infoIcon.style.justifyContent = 'center'; // 水平居中
    infoIcon.title = title; // 设置悬浮提示

    return infoIcon;
}