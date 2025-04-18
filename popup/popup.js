let studentData = [];
let photoFiles = {};
let isPaused = false;
let currentIndex = 0;
let processCount = 0;

document.getElementById('excelFile').addEventListener('change', handleFileSelect);
document.getElementById('photoFiles').addEventListener('change', handlePhotoSelect);
document.getElementById('startBtn').addEventListener('click', startProcess);
document.getElementById('pauseBtn').addEventListener('click', togglePause);

function handleFileSelect(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      studentData = XLSX.utils.sheet_to_json(firstSheet);
      console.log('studentData', studentData);
    
      
      if (studentData.length > 0) {
        // 验证Excel文件是否包含必要的列
        if (!studentData[0].hasOwnProperty('一寸照片')) {
          alert('Excel文件缺少"一寸照片"列，请检查文件格式！');
          studentData = [];
        }
        checkStartCondition();
      }
    } catch (error) {
      alert('Excel 文件解析失败，请检查文件格式！');
      console.error('Excel parsing error:', error);
    }
  };

  reader.readAsArrayBuffer(file);
}

function handlePhotoSelect(event) {
  const files = event.target.files;
  photoFiles = {};
  
  // 创建照片文件名到文件内容的映射
  for (let file of files) {
    if (file.type.startsWith('image/')) {
      const photoFileName = file.name; // 完整的文件名（包含扩展名）
      const reader = new FileReader();
      
      reader.onload = function(e) {
        photoFiles[photoFileName] = e.target.result;
        checkStartCondition();
      };
      
      reader.readAsDataURL(file);
    }
  }
}

function checkStartCondition() {
  const hasStudentData = studentData.length > 0;
  const hasPhotoFiles = Object.keys(photoFiles).length > 0;
  
  // 验证每个学生的照片是否都存在
  // const allPhotosExist = studentData.every(student => {
  //   console.log('photoFiles', photoFiles);
  //   return student['一寸照片'] && photoFiles.hasOwnProperty(student['一寸照片']);
  // });
  
  // if (hasStudentData && hasPhotoFiles && !allPhotosExist) {
  //   alert('部分学生的照片文件缺失，请检查照片文件是否完整！');
  // }
  
  // document.getElementById('startBtn').disabled = !(hasStudentData && hasPhotoFiles && allPhotosExist)
  document.getElementById('startBtn').disabled = !(hasStudentData && hasPhotoFiles);
}

function startProcess() {
  if (currentIndex >= studentData.length) {
    currentIndex = 0;
    processCount = 0;
  }

  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('pauseBtn').style.display = 'block';
  document.querySelector('.progress-section').style.display = 'block';
  
  isPaused = false;
  processNext();
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById('pauseBtn').textContent = isPaused ? '继续' : '暂停';
  
  if (!isPaused) {
    processNext();
  }
}

function processNext() {
  if (isPaused || currentIndex >= studentData.length) {
    if (currentIndex >= studentData.length) {
      alert('所有数据处理完成！');
      document.getElementById('pauseBtn').style.display = 'none';
      document.getElementById('startBtn').style.display = 'block';
      document.getElementById('startBtn').textContent = '重新开始';
    }
    return;
  }

  const student = studentData[currentIndex];
  document.getElementById('currentStudent').textContent = student['姓名中文'];
  
  // 检查是否需要暂停（每处理5个学生）
  // if (processCount >= 5) {
  if (processCount >= 1) {
    isPaused = true;
    processCount = 0;
    document.getElementById('pauseBtn').textContent = '继续';
    alert('已处理1名学生，请检查报名信息是否正确后继续。');
    return;
  }

  console.log('当前学生', student);
  console.log('photoFiles', photoFiles[student['一寸照片']]);
  student['监护人邮箱'] = 'mingzhenghua@163.com';
  student['监护人手机'] = '13896097261';
  // 发送消息给 content script
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'fillForm',
      data: student,
      photoData: photoFiles[student['一寸照片']]
    }, function(response) {
      console.log('popup 收到消息', response);
      if (response && response.success) {
        updateSuccessCount();
      } else {
        updateFailCount();
      }
      
      currentIndex++;
      processCount++;
      updateProgress(currentIndex, studentData.length);
      
      // 延迟处理下一条数据，避免页面响应不及时
      setTimeout(processNext, 2000);
    });
  });
}

function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  document.getElementById('progressBar').style.width = percentage + '%';
  document.getElementById('progressText').textContent = `${current}/${total}`;
}

function updateSuccessCount() {
  const element = document.getElementById('successCount');
  element.textContent = parseInt(element.textContent) + 1;
}

function updateFailCount() {
  const element = document.getElementById('failCount');
  element.textContent = parseInt(element.textContent) + 1;
} 