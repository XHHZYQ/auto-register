// 字段映射配置
const FIELD_MAPPING = {
  '姓名中文': 'input[name="name"]',
  '性别': 'select[name="gender"]',
  '民族': 'select[name="nation"]',
  '学校全称': 'input[name="school"]',
  '年级': 'select[name="grade"]',
  '身份证号': 'input[name="idCard"]',
  '监护人邮箱': 'input[name="email"]',
  '监护人手机': 'input[name="phone"]',
  '一寸照片': 'input[type="file"]'
};

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    handleFormFill(request.data)
      .then(result => sendResponse({ success: result }))
      .catch(error => {
        console.error('Form fill error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开启
  }
});

// 处理表单填写
async function handleFormFill(studentData) {
  try {
    // 填充表单字段
    await autoFillForm(studentData);
    
    // 提交表单并等待结果
    const result = await submitForm();
    return result === 'success';
  } catch (error) {
    console.error('Form handling error:', error);
    return false;
  }
}

// 自动填充表单
async function autoFillForm(studentData) {
  for (const [field, value] of Object.entries(studentData)) {
    if (!FIELD_MAPPING[field]) continue;
    
    const selector = FIELD_MAPPING[field];
    const element = document.querySelector(selector);
    
    if (!element) {
      console.warn(`Element not found for field: ${field}`);
      continue;
    }

    if (element.tagName === 'SELECT') {
      await handleSelect(element, value);
    } else if (element.type === 'file') {
      await handleFileUpload(element, value);
    } else {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// 处理下拉框选择
async function handleSelect(element, value) {
  // 查找匹配的选项
  const option = Array.from(element.options).find(opt => 
    opt.text.trim() === value.trim() || opt.value.trim() === value.trim()
  );

  if (option) {
    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    console.warn(`Option not found for value: ${value}`);
  }
}

// 处理文件上传
async function handleFileUpload(element, base64Data) {
  try {
    // 将 base64 转换为 File 对象
    const response = await fetch(base64Data);
    const blob = await response.blob();
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    
    // 创建 FileList 对象
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    element.files = dataTransfer.files;
    
    // 触发 change 事件
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

// 提交表单
async function submitForm() {
  return new Promise((resolve, reject) => {
    const submitButton = document.querySelector('button[type="submit"]');
    if (!submitButton) {
      reject(new Error('Submit button not found'));
      return;
    }

    submitButton.click();
    
    // 监听接口响应
    const observer = new MutationObserver((mutations) => {
      // 检查成功或失败提示
      if (document.querySelector('.success-message')) {
        observer.disconnect();
        resolve('success');
      } else if (document.querySelector('.error-message')) {
        observer.disconnect();
        resolve('error');
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 设置超时处理
    setTimeout(() => {
      observer.disconnect();
      resolve('timeout');
    }, 30000);
  });
} 