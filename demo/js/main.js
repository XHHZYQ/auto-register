new Vue({
    el: '#app',
    data: {
        activeIndex: '1',
        dialogVisible: false,
        commitmentDialogVisible: false,
        isCommitmentChecked: false,
        addMemberDialogVisible: false,
        formData: {
            teacher: '',
            competition: '',
            group: '',
            members: []
        },
        memberForm: {
            name: '',
            gender: '',
            nation: '',
            idCardType: 'id',
            idCard: '',
            phone: '',
            email: '',
            school: '',
            grade: '',
            photo: null
        },
        photoPreview: '',
        uploadProgress: 0,
        teachers: [
            '张三', '李四', '王五', '赵六', '钱七', '孙八'
        ],
        competitions: [
            '比赛A', '比赛B', '比赛C'
        ],
        groups: [
            '小学组', '初中组', '高中组'
        ],
        grades: Array.from({length: 12}, (_, i) => `${i + 1}年级`)
    },
    methods: {
        handleSelect(key) {
            this.activeIndex = key;
            if (key === '2') {
                this.commitmentDialogVisible = true;
            }
        },
        
        handleCommitment() {
            if (this.isCommitmentChecked) {
                this.commitmentDialogVisible = false;
            }
        },
        
        selectTeacher(teacher) {
            this.formData.teacher = teacher;
        },
        
        showAddMemberDialog() {
            this.memberForm = {
                name: '',
                gender: '',
                nation: '',
                idCardType: 'id',
                idCard: '',
                phone: '',
                email: '',
                school: '',
                grade: '',
                photo: null
            };
            this.photoPreview = '';
            this.uploadProgress = 0;
            this.addMemberDialogVisible = true;
        },
        
        handlePhotoChange(event) {
            const file = event.target.files[0];
            if (!file) return;

            // 文件类型验证
            if (!file.type.startsWith('image/')) {
                this.$message.error('请上传图片文件');
                return;
            }

            // 文件大小验证（2MB）
            if (file.size > 2 * 1024 * 1024) {
                this.$message.error('照片大小不能超过2MB');
                return;
            }

            // 预览照片
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photoPreview = e.target.result;
            };
            reader.readAsDataURL(file);

            // 上传文件
            this.uploadPhoto(file);
        },

        uploadPhoto(file) {
            // 重置进度
            this.uploadProgress = 0;
            
            // 模拟文件上传
            return new Promise((resolve, reject) => {
                const totalSize = file.size;
                let loadedSize = 0;
                const chunkSize = totalSize / 10; // 模拟10个上传块
                
                const upload = () => {
                    if (loadedSize >= totalSize) {
                        // 上传完成
                        this.memberForm.photo = {
                            url: this.photoPreview,
                            filename: file.name
                        };
                        this.uploadProgress = 100;
                        resolve();
                        return;
                    }

                    // 模拟分块上传
                    setTimeout(() => {
                        loadedSize += chunkSize;
                        this.uploadProgress = Math.min(Math.round((loadedSize / totalSize) * 100), 100);
                        upload();
                    }, 200);
                };

                upload();
            }).catch(error => {
                this.$message.error('照片上传失败，请重试');
                this.photoPreview = '';
                this.uploadProgress = 0;
                // 清空文件输入
                if (this.$refs.photoInput) {
                    this.$refs.photoInput.value = '';
                }
            });
        },
        
        addMember() {
            if (!this.validateMemberForm()) {
                return;
            }
            
            // 模拟API调用
            this.submitMemberToServer(this.memberForm).then(() => {
                this.formData.members.push({...this.memberForm});
                this.addMemberDialogVisible = false;
                this.$message.success('队员添加成功！');
            }).catch(error => {
                this.$message.error(error.message || '添加失败，请重试');
            });
        },
        
        submitMemberToServer(memberData) {
            // 模拟API调用
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (Math.random() > 0.1) { // 90%成功率
                        resolve();
                    } else {
                        reject(new Error('服务器错误'));
                    }
                }, 1000);
            });
        },
        
        validateMemberForm() {
            if (!this.memberForm.name) {
                this.$message.error('请输入姓名');
                return false;
            }
            if (!this.memberForm.gender) {
                this.$message.error('请选择性别');
                return false;
            }
            if (!this.memberForm.nation) {
                this.$message.error('请输入民族');
                return false;
            }
            if (!this.memberForm.school) {
                this.$message.error('请输入学校全称');
                return false;
            }
            if (!this.memberForm.grade) {
                this.$message.error('请选择年级');
                return false;
            }
            if (!this.memberForm.idCard) {
                this.$message.error('请输入证件号码');
                return false;
            }
            if (!this.memberForm.email) {
                this.$message.error('请输入监护人邮箱');
                return false;
            }
            if (!this.memberForm.phone) {
                this.$message.error('请输入监护人手机');
                return false;
            }
            if (!this.memberForm.photo || !this.memberForm.photo.url) {
                this.$message.error('请上传照片');
                return false;
            }
            return true;
        },
        
        removeMember(index) {
            this.formData.members.splice(index, 1);
        },
        
        submitForm() {
            if (!this.validateForm()) {
                return;
            }
            
            // 模拟提交到服务器
            this.submitFormToServer(this.formData).then(() => {
                this.$message.success('提交成功！');
                // 可以在这里添加跳转逻辑
            }).catch(error => {
                this.$message.error(error.message || '提交失败，请重试');
            });
        },
        
        submitFormToServer(formData) {
            // 模拟API调用
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (Math.random() > 0.1) { // 90%成功率
                        resolve();
                    } else {
                        reject(new Error('服务器错误'));
                    }
                }, 1500);
            });
        },
        
        validateForm() {
            if (!this.formData.teacher) {
                this.$message.error('请选择指导教师');
                return false;
            }
            if (!this.formData.competition) {
                this.$message.error('请选择比赛项目');
                return false;
            }
            if (!this.formData.group) {
                this.$message.error('请选择组别');
                return false;
            }
            if (this.formData.members.length === 0) {
                this.$message.error('请至少添加一名队员');
                return false;
            }
            return true;
        }
    }
}); 