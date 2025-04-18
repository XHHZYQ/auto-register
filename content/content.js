// 字段映射配置
const FIELD_MAPPING = {
  '姓名中文': 'input[placeholder="请输入中文姓名"]',
  '性别': '.am-input-group:has(span:contains("性别")) select',
  '民族': 'input[placeholder="请输入民族"]',
  '学校全称': 'input[placeholder="请输入学校名称"]',
  '年级': '.am-input-group:has(span:contains("年级")) select',
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

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('监听来自 popup 的消息', request);
  if (request.action === 'fillForm') {
    handleFormFill(request.data, request.photoData)
      .then(result => sendResponse({ success: result }))
      .catch(error => {
        console.error('Form fill error:', error);
        sendResponse({ success: false, error: error.message });
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
    
    // 6. 提交表单
    return success;
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
      console.log('承诺书弹窗', checkbox, confirmButton);
      
      if (checkbox && confirmButton) {
        clearTimeout(checkDialog);
        
        // 勾选复选框
        checkbox.click();
        
        // 点击确认按钮
        setTimeout(() => {
          confirmButton.click();
        }, 20);
        resolve();
      }
    }, 500);
    
    // 设置超时
    setTimeout(() => {
      clearTimeout(checkDialog);
      reject(new Error('License dialog timeout'));
    }, 5000);
  });
}

// 随机选择指导教师
async function selectRandomTeacher() {
  return new Promise((resolve, reject) => {
    const teacherButtons = document.querySelectorAll('.teacherICon .el-button');
    console.log('随机选择指导教师', teacherButtons);
    if (teacherButtons.length === 0) {
      reject(new Error('No teacher buttons found'));
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * teacherButtons.length);
    console.log('随机选择指导教师', teacherButtons[randomIndex]);
    setTimeout(() => {
      teacherButtons[randomIndex].click();
      resolve();
    }, 20);
  });
}

// 填写参赛信息
async function fillCompetitionInfo(studentData) {
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

    // 在表单容器中查找并填写表单
    try {
        // 选择赛项名称
        const competitionSelect = formContainer.querySelector('select.el-select');
        console.log('赛项名称', competitionSelect);
        if (competitionSelect) {
            await handleSelect(competitionSelect, FIXED_OPTIONS['赛项名称']);
        }

        // 选择队员组别
        const groupSelect = formContainer.querySelectorAll('select.el-select')[1];
        console.log('队员组别', groupSelect);
        if (groupSelect) {
            await handleSelect(groupSelect, FIXED_OPTIONS['队员组别']);
        }

        // 选择省份和城市
        const locationSelects = formContainer.querySelectorAll('.province-select, .city-select');
        if (locationSelects.length >= 2) {
            await handleSelect(locationSelects[0], FIXED_OPTIONS['省份']);
            await handleSelect(locationSelects[1], FIXED_OPTIONS['城市']);
        }

        // 填写团队名称
        const teamNameInput = formContainer.querySelector('input[placeholder="请输入您的队名，团队名称限制在5个汉字以内"]');
        if (teamNameInput) {
            teamNameInput.value = `${studentData['姓名中文']}团队`;
            teamNameInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            console.warn('团队名称输入框未找到');
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
          resolve();
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
  for (const group of groups) {
      const label = group.querySelector('.am-input-group-label');
      if (label && label.textContent.includes(labelText)) {
          return group.querySelector('select');
      }
  }
  return null;
}

// 填写队员表单
async function fillMemberForm(studentData, photoData) {
  for (const [field, value] of Object.entries(studentData)) {
    if (!FIELD_MAPPING[field]) continue;
    console.log('填写队员表单 0', field, value);
    
    let element;
    if (field === '性别' || field === '年级') {
      element = findSelectByLabel(document, field);
    } else {
      const selector = FIELD_MAPPING[field];
      console.log('填写队员表单 1', selector);
      element = document.querySelector(selector);
    }
    console.log('填写队员表单 2', element);
    
    if (!element) {
      console.warn(`Element not found for field: ${field}`);
      continue;
    }

    if (element.tagName === 'SELECT') {
      await handleSelect(element, value);
    } else if (element.type === 'file' && field === '一寸照片') {
      await handlePhotoUpload(element, photoData[studentData['一寸照片']]);
    } else {
      element.value = field in FIXED_OPTIONS ? FIXED_OPTIONS[field] : value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  
  // 点击提交按钮
  const submitButton = document.querySelector('.memFooter button');
  if (submitButton) {
    submitButton.click();
  }
}

// 处理下拉框选择
async function handleSelect(element, value) {
  const option = Array.from(element.options).find(opt => 
    opt.text.trim() === value.trim() || opt.value.trim() === value.trim()
  );

  if (option) {
    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// 处理照片上传
async function handlePhotoUpload(element, photoData) {
  try {
    const response = await fetch(photoData);
    const blob = await response.blob();
    const file = new File([blob], 'filename.jpg', { type: 'image/jpg' });
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    console.log('处理照片上传 0', element.files, dataTransfer.files);
    element.files = dataTransfer.files;
    console.log('处理照片上传 1', element.files);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (error) {
    console.error('Photo upload error:', error);
    throw error;
  }
}

// 选择下拉框选项
async function selectDropdownOption(field, value) {
  return new Promise((resolve, reject) => {
    const select = document.querySelector(`select[data-field="${field}"]`);
    if (!select) {
      reject(new Error(`Select not found for field: ${field}`));
      return;
    }
    
    const option = Array.from(select.options).find(opt => opt.text === value);
    if (!option) {
      reject(new Error(`Option not found: ${value}`));
      return;
    }
    
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    resolve();
  });
}

// 提交表单
async function submitForm() {
  return new Promise((resolve, reject) => {
    const submitButton = document.querySelector('button.submitB');
    if (!submitButton) {
      reject(new Error('Submit button not found'));
      return;
    }

    submitButton.click();
    
    const observer = new MutationObserver((mutations) => {
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
    
    setTimeout(() => {
      observer.disconnect();
      resolve('timeout');
    }, 30000);
  });
} 