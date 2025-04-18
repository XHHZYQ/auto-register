// 字段映射配置
const FIELD_MAPPING = {
  '姓名中文': 'input[placeholder="请输入您的中文姓名"]',
  '性别': 'select[placeholder="请选择"]',
  '民族': 'input[placeholder="请输入您的民族"]',
  '学校全称': 'input[placeholder="请输入您的学校名称"]',
  '年级': 'select[placeholder="请选择"]',
  '身份证号': 'input[placeholder="请输入身份证号"]',
  '监护人邮箱': 'input[placeholder="请输入您的邮箱"]',
  '监护人手机': 'input[placeholder="请输入您的手机号"]',
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

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
    // 1. 点击"注册新团队"按钮
    await clickRegisterTeamButton();
    
    // 2. 处理承诺书弹窗
    await handleLicenseDialog();
    
    // 3. 随机选择指导教师
    await selectRandomTeacher();
    
    // 4. 填写参赛信息
    await fillCompetitionInfo(studentData);
    
    // 5. 添加队员信息
    await addTeamMember(studentData, photoData);
    
    // 6. 提交表单
    return await submitForm();
  } catch (error) {
    console.error('Registration process error:', error);
    return false;
  }
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
    
    registerButton.click();
    resolve();
  });
}

// 处理承诺书弹窗
async function handleLicenseDialog() {
  return new Promise((resolve, reject) => {
    // 等待弹窗出现
    const checkDialog = setInterval(() => {
      const checkbox = document.querySelector('.el-checkbox__input input[type="checkbox"]');
      const confirmButton = document.querySelector('.memOk.am-btn-primary');
      
      if (checkbox && confirmButton) {
        clearInterval(checkDialog);
        
        // 勾选复选框
        checkbox.click();
        
        // 点击确认按钮
        confirmButton.click();
        resolve();
      }
    }, 500);
    
    // 设置超时
    setTimeout(() => {
      clearInterval(checkDialog);
      reject(new Error('License dialog timeout'));
    }, 5000);
  });
}

// 随机选择指导教师
async function selectRandomTeacher() {
  return new Promise((resolve, reject) => {
    const teacherButtons = document.querySelectorAll('.teacherICon .el-button');
    if (teacherButtons.length === 0) {
      reject(new Error('No teacher buttons found'));
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * teacherButtons.length);
    teacherButtons[randomIndex].click();
    resolve();
  });
}

// 填写参赛信息
async function fillCompetitionInfo(studentData) {
  // 选择赛项名称
  await selectDropdownOption('赛项名称', FIXED_OPTIONS['赛项名称']);
  
  // 选择队员组别
  await selectDropdownOption('队员组别', FIXED_OPTIONS['队员组别']);
  
  // 选择省份
  await selectDropdownOption('省份', FIXED_OPTIONS['省份']);
  
  // 选择城市
  await selectDropdownOption('城市', FIXED_OPTIONS['城市']);
  
  // 填写团队名称
  const teamNameInput = document.querySelector('input[placeholder="请输入您的队名，团队名称限制在5个汉字以内"]');
  if (teamNameInput) {
    teamNameInput.value = `${studentData['姓名中文']}团队`;
    teamNameInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// 添加队员信息
async function addTeamMember(studentData, photoData) {
  return new Promise((resolve, reject) => {
    // 点击添加队员按钮
    const addButton = document.querySelector('button.submitC');
    if (!addButton) {
      reject(new Error('Add member button not found'));
      return;
    }
    
    addButton.click();
    
    // 等待弹窗出现并填写信息
    const checkDialog = setInterval(async () => {
      const form = document.querySelector('.memBody.am-modal-bd form');
      if (form) {
        clearInterval(checkDialog);
        
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

// 填写队员表单
async function fillMemberForm(studentData, photoData) {
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
    } else if (element.type === 'file' && field === '一寸照片') {
      await handlePhotoUpload(element, photoData[studentData['证件号码']]);
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
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    element.files = dataTransfer.files;
    
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