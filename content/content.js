// 字段映射配置
const FIELD_MAPPING = {
  '姓名中文': 'input[placeholder="请输入中文姓名"]',
  '性别': '.am-input-group:has(span:contains("性别")) .el-select',
  '民族': 'input[placeholder="请输入民族"]',
  '学校全称': 'input[placeholder="请输入学校名称"]',
  '年级': '.am-input-group:has(span:contains("年级")) .el-select',
  '身份证号': 'input[placeholder="请输入身份证号"]',
  '监护人邮箱': 'input[placeholder="请输入邮箱"]',
  '监护人手机': 'input[placeholder="请输入手机号"]',
  '一寸照片': 'input[type="file"]'
};

// 固定选项配置
const FIXED_OPTIONS = {
  '赛项名称': 'B4: 信息科技算法',
  '队员组别': '中学组',
  '省份': '重庆',
  '城市': '重庆',
  '监护人邮箱': 'mingzhenghua@163.com',
  '监护人手机': '13896097261'
};

// 初始化状态
let isInitialized = false;

// 存储上传的数据
let uploadedData = {
  students: [],
  photos: {}
};

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('监听来自 popup 的消息', request);
  if (request.action === 'fillForm') {
    // 保存上传的数据
    uploadedData.students = request.data;
    uploadedData.photos = request.photoData;
    
    handleFormFill(request.data, request.photoData)
      .then(result => sendResponse({ success: result }))
      .catch(error => {
        console.error('Form fill error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === 'getStoredData') {
    // 返回已存储的数据
    sendResponse({
      students: uploadedData.students,
      photos: uploadedData.photos
    });
    return true;
  }
});

// 处理整个报名流程
async function handleFormFill(studentData, photoData) {
  try {
    // 如果未初始化，先进行初始化流程
    if (!isInitialized) {
      await initializeRegistration();
      isInitialized = true;
    }

    // 3. 随机选择指导教师
    await selectRandomTeacher();

    // 4. 填写参赛信息
    await fillCompetitionInfo(studentData);

    // 5. 添加队员信息
    const success = await addTeamMember(studentData, photoData);

    // 6. 点击预览确认按钮
    await handlePreviewConfirm();

    // 7. 点击提交报名按钮
    await handleSubmitRegistration();

    // 8. 处理成功弹窗
    await handleSuccessDialog();

    return true;
  } catch (error) {
    console.error('Registration process error:', error);
    return false;
  }
}

// 初始化报名流程
async function initializeRegistration() {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. 点击"注册新团队"按钮
      await clickRegisterTeamButton();

      // 2. 处理承诺书弹窗
      await handleLicenseDialog();

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// 点击注册新团队按钮
async function clickRegisterTeamButton() {
  return new Promise((resolve, reject) => {
    const registerButton = Array.from(document.querySelectorAll('.el-menu-item'))
      .find(el => el.textContent.trim() === '注册新团队');

    if (!registerButton) {
      reject(new Error('Register team button not found'));
      return;
    }
    console.log('点击注册新团队按钮', registerButton);
    registerButton.click();
    resolve();
  });
}

// 处理承诺书弹窗
async function handleLicenseDialog() {
  return new Promise((resolve, reject) => {
    // 等待弹窗出现
    const checkDialog = setTimeout(() => {
      const checkbox = document.querySelector('.el-checkbox__input input[type="checkbox"]');
      const confirmButton = document.querySelector('.memOk.am-btn-primary');
      const dialog = document.querySelector('.el-dialog__wrapper');
      console.log('承诺书弹窗', checkbox, confirmButton);

      if (checkbox && confirmButton && dialog) {
        clearTimeout(checkDialog);

        // 勾选复选框
        checkbox.click();

        // 点击确认按钮
        confirmButton.click();

        // 手动关闭弹窗
        dialog.style.display = 'none';
        // 移除弹窗的遮罩层
        const mask = document.querySelector('.v-modal');
        if (mask) {
          mask.parentNode.removeChild(mask);
        }

        setTimeout(() => {
          resolve();
        }, 100);
      }
    }, 500);

    // 设置超时
    setTimeout(() => {
      clearTimeout(checkDialog);
      reject(new Error('License dialog timeout'));
    }, 5000);
  });
}

// 辅助函数：等待元素出现
async function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// 辅助函数：等待下拉选项加载完成
async function waitForDropdownOptions(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver((mutations) => {
      const options = document.querySelectorAll(selector);
      console.log('等待下拉选项加载完成 options', options, options.length);
      if (options && options.length > 0) {
        observer.disconnect();
        resolve(Array.from(options));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Dropdown options not found within ${timeout}ms`));
    }, timeout);
  });
}

// 修改随机选择指导教师函数
async function selectRandomTeacher() {
  try {
    // 等待指导教师按钮出现
    const teacherButtons = await waitForElement('.teacherICon .el-button');
    if (!teacherButtons) {
      throw new Error('No teacher buttons found');
    }

    const buttons = document.querySelectorAll('.teacherICon .el-button');
    const randomIndex = Math.floor(Math.random() * buttons.length);
    buttons[randomIndex].click();
    
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}

// 修改填写参赛信息函数
async function fillCompetitionInfo(studentData) {
  try {
    // 先找到"参赛信息"标题元素
    const titleElement = Array.from(document.querySelectorAll('.titleB'))
    .find(el => el.textContent.trim() === '参赛信息：');

    if (!titleElement) {
    console.error('参赛信息标题未找到');
    throw new Error('Competition info title not found');
    }

    // 找到表单容器
    const formContainer = titleElement.nextElementSibling;
    console.log('参赛信息表单', formContainer);
    if (!formContainer || !formContainer.classList.contains('nn95c')) {
    console.error('参赛信息表单未找到');
    throw new Error('Competition info form not found');
    }

    // 选择赛项名称
    const competitionSelect = await waitForElement('.el-select');
    if (competitionSelect) {
      await handleSelect(competitionSelect, FIXED_OPTIONS['赛项名称']);
    }

    // 等待并选择队员组别
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待接口返回
    const groupSelect = formContainer.querySelectorAll('.el-select')[1];
    if (groupSelect) {
      await handleSelect(groupSelect, FIXED_OPTIONS['队员组别']);
    }

    // 选择省份和城市
    const locationSelects = formContainer.querySelectorAll('.el-select');
    console.log('locationSelects', locationSelects);
    if (locationSelects.length >= 4) {
      await handleSelect(locationSelects[2], FIXED_OPTIONS['省份']);
      // 等待城市列表加载
      await new Promise(resolve => setTimeout(resolve, 5000));
      await handleSelect(locationSelects[3], FIXED_OPTIONS['城市']);
    }

    // 填写团队名称
    const teamNameInput = await waitForElement('input[placeholder="请输入您的队名，团队名称限制在5个汉字以内"]');
    if (teamNameInput) {
      teamNameInput.value = `${studentData['姓名中文']}团队`;
      teamNameInput.dispatchEvent(new Event('change', { bubbles: true }));
      teamNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } catch (error) {
    console.error('填写参赛信息失败:', error);
    throw error;
  }
}

// 添加队员信息
async function addTeamMember(studentData, photoData) {
  return new Promise((resolve, reject) => {
    // 点击添加队员按钮
    const addButton = document.querySelector('button.submitC');
    console.log('添加队员按钮', addButton);
    if (!addButton) {
      reject(new Error('Add member button not found'));
      return;
    }

    addButton.click();

    // 等待弹窗出现并填写信息
    const checkDialog = setTimeout(async () => {
      const form = document.querySelector('.memBody.am-modal-bd form');
      console.log('添加队员弹窗', form);
      if (form) {
        clearTimeout(checkDialog);

        try {
          await fillMemberForm(studentData, photoData);
          setTimeout(() => {
            resolve();
          }, 500);
        } catch (error) {
          reject(error);
        }
      }
    }, 500);
  });
}

// 辅助函数：通过label文本查找对应的select元素
function findSelectByLabel(container, labelText) {
  const groups = container.querySelectorAll('.am-input-group');
  console.log('groups', groups);
  for (const group of groups) {
    const label = group.querySelector('.am-input-group-label');
    console.log('label', label);
    console.log('label.textContent', label.textContent);
    console.log('includes(labelText)', label.textContent.includes(labelText));
    if (label && label.textContent.includes(labelText)) {
      console.log('group.querySelector(".el-select")', group.querySelector('.el-select'));
      return group.querySelector('.el-select');
    }
  }
  return null;
}

// 填写队员表单
async function fillMemberForm(studentData, photoData) {
  // 获取弹窗表单容器
  const formContainer = document.querySelector('.memBody.am-modal-bd');
  if (!formContainer) {
    throw new Error('Member form container not found');
  }

  for (const [field, value] of Object.entries(studentData)) {
    if (!FIELD_MAPPING[field]) continue;
    console.log('填写队员表单 0', field, value);

    let element;
    if (field === '性别' || field === '年级') {
      element = findSelectByLabel(formContainer, field);
    } else {
      const selector = FIELD_MAPPING[field];
      console.log('填写队员表单 1', selector);
      element = formContainer.querySelector(selector);
    }
    console.log('填写队员表单 2', element);

    if (!element) {
      console.warn(`Element not found for field: ${field}`);
      continue;
    }

    if (element.classList.contains('el-select')) {
      await handleSelect(element, value);
    } else if (element.type === 'file' && field === '一寸照片') {
      console.log('填写队员表单 3', photoData);
      console.log('填写队员表单 4', studentData['一寸照片']);
      await handlePhotoUpload(element, photoData);
    } else {
      element.value = field in FIXED_OPTIONS ? FIXED_OPTIONS[field] : value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // 点击提交按钮
  const submitButton = document.querySelector('.memFooter button.memOk.am-btn.am-btn-primary');
  console.log('提交按钮', submitButton);
  if (submitButton) {
    submitButton.click();
  }
}

// 修改处理下拉框选择函数
async function handleSelect(element, value) {
  return new Promise(async (resolve, reject) => {
    try {
      // 点击下拉框以显示选项
      const input = element.querySelector('.el-input__inner');
      console.log('input.click()', input);
      if (!input) {
        reject(new Error('Select input not found'));
        return;
      }
      
      input.click();
      
      // 等待下拉选项出现
      const options = await waitForDropdownOptions('.el-select-dropdown__item');
      console.log('options', value, options);
      const targetOption = options.find(opt => {
        return opt.textContent.trim() === value.trim();
      });
      console.log('targetOption', targetOption);
      if (targetOption) {
        targetOption.click();
        resolve();
      } else {
        reject(new Error(`Option not found: ${value}`));
      }
    } catch (error) {
      reject(error);
    }
  });
}

// 处理照片上传
async function handlePhotoUpload(element, photoData) {
  try {
    console.log('处理照片上传 0', photoData);
    const response = await fetch(photoData);
    console.log('处理照片上传 1', response);
    const blob = await response.blob();
    const file = new File([blob], 'filename.jpg', { type: 'image/jpg' });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    console.log('处理照片上传 2', element.files, dataTransfer.files);
    element.files = dataTransfer.files;
    console.log('处理照片上传 3', element.files);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (error) {
    console.error('Photo upload error:', error);
    throw error;
  }
}

// 选择下拉框选项
async function selectDropdownOption(field, value) {
  return new Promise((resolve, reject) => {
    const select = document.querySelector(`.el-select[data-field="${field}"]`);
    if (!select) {
      reject(new Error(`Select not found for field: ${field}`));
      return;
    }

    handleSelect(select, value)
      .then(resolve)
      .catch(reject);
  });
}

// 处理预览确认按钮点击
async function handlePreviewConfirm() {
  return new Promise(async (resolve, reject) => {
    try {
      // 查找预览确认按钮
      const previewButton = await waitForElement('button.submitB.am-btn.am-btn-secondary.am-active');
      if (!previewButton || previewButton.textContent.trim() !== '预览确认') {
        throw new Error('Preview button not found');
      }
      
      console.log('点击预览确认按钮', previewButton);
      previewButton.click();
      
      // 等待预览内容加载完成
      await waitForElement('.infoCon');
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// 处理提交报名按钮点击
async function handleSubmitRegistration() {
  return new Promise(async (resolve, reject) => {
    try {
      // 查找提交报名按钮
      const submitButton = await waitForElement('button.memOk.am-btn.am-btn-primary.am-btn.am-btn-secondary');
      if (!submitButton || submitButton.textContent.trim() !== '提交报名') {
        throw new Error('Submit registration button not found');
      }
      
      console.log('点击提交报名按钮');
      submitButton.click();
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// 处理成功弹窗
async function handleSuccessDialog() {
  return new Promise(async (resolve, reject) => {
    try {
      // 等待成功弹窗出现
      const titleElement = await waitForElement('.el-message-box__title span');
      if (!titleElement || titleElement.textContent.trim() !== '报名成功') {
        throw new Error('Success dialog title not found');
      }
      
      // 查找确定按钮
      const confirmButton = document.querySelector('.el-message-box__btns button');
      if (!confirmButton || confirmButton.textContent.trim() !== '确定') {
        throw new Error('Success dialog confirm button not found');
      }
      
      console.log('点击成功弹窗确定按钮');
      confirmButton.click();
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
} 