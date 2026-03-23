/**
 * Dynamic Admin Panel Loader
 * Handles content persistence onto localStorage without a backend.
 */

const AdminPanel = {
    credentials: {
        email: 'divyanshusahu71@gmail.com',
        pass: 'DIVU'
    },
    fields: [
        { id: 'cvFile', label: 'My Resume (PDF)', type: 'fileUpload', selector: '.highlight-cv' },
        { id: 'heroTitle', label: 'Hero Title (HTML allowed)', selector: '.hero-title' },
        { id: 'heroName', label: 'Hero Name', selector: '.subtitle p:first-child' },
        { id: 'heroRole', label: 'Hero Role', selector: '.subtitle .role' },
        { id: 'aboutText', label: 'About Me (Text only, auto-formats paragraphs)', selector: '.typewriter-container', rows: 8, isAbout: true },
        { id: 'skills', label: 'My Skills', type: 'list', selector: '.stack-cloud' },
        { id: 'projects', label: 'My Projects', type: 'projects', selector: '#work .section-content' },
        { id: 'certificates', label: 'My Certificates (Canvas)', type: 'certificates', selector: '#phil-canvas' },
        { id: 'education', label: 'Education Timeline', type: 'education', selector: '#experience .timeline' },
        { id: 'contact', label: 'Contact Links', type: 'contact', selector: '#contact .project-content p' },
        { id: 'contactEmail', label: 'Footer Email', selector: '.email-link' }
    ],

    init() {
        this.injectStyles();
        this.createUI();
        this.bindEvents();
    },

    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .admin-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
                z-index: 99999; display: flex; justify-content: center; align-items: center;
                opacity: 0; pointer-events: none; transition: opacity 0.3s;
                font-family: 'Inter', sans-serif;
            }
            .admin-modal-overlay.active {
                opacity: 1; pointer-events: auto;
            }
            .admin-modal {
                background: #111; border: 1px solid rgba(255,255,255,0.1);
                padding: 2.5rem; border-radius: 12px; width: 90%; max-width: 600px;
                color: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                max-height: 90vh; overflow-y: auto;
            }
            .admin-modal h2 { margin-bottom: 1.5rem; font-weight: 600; font-size: 1.5rem; }
            .admin-modal .form-group { margin-bottom: 1.25rem; text-align: left; }
            .admin-modal label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 0.5rem; }
            .admin-modal input, .admin-modal textarea {
                width: 100%; padding: 0.85rem; background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 6px;
                font-family: inherit; font-size: 0.95rem;
            }
            .admin-modal input:focus, .admin-modal textarea:focus {
                outline: none; border-color: #ff4400; background: rgba(255,68,0,0.05);
            }
            .admin-modal button.btn {
                background: #ff4400; color: #fff; border: none; padding: 0.85rem 1.5rem;
                border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s;
                width: 100%; margin-top: 1rem;
            }
            .admin-modal button.btn-small { padding: 0.5rem 1rem; width: auto; font-size: 0.85rem; }
            .admin-modal button.btn:hover { background: #e03c00; }
            .admin-modal button.btn-close {
                background: transparent; border: 1px solid rgba(255,255,255,0.2);
                margin-top: 0.75rem;
            }
            .admin-modal button.btn-close:hover { background: rgba(255,255,255,0.1); }
            .admin-error { color: #ff4444; font-size: 0.85rem; margin-top: 0.5rem; display: none; }
            
            /* Dynamic List UI */
            .admin-list-row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: stretch; }
            .admin-list-row .list-input-name { flex: 0.35; padding: 0.6rem; }
            .admin-list-row .list-input-desc { flex: 0.65; padding: 0.6rem; }
            .btn-delete-row { background: #551111; color: white; border: none; padding: 0 1rem; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;}
            .btn-delete-row:hover { background: #ff4444; }

            /* Scrollbar for dashboard */
            .admin-modal::-webkit-scrollbar { width: 6px; }
            .admin-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        `;
        document.head.appendChild(style);
    },

    createUI() {
        // Login Modal
        const loginOverlay = document.createElement('div');
        loginOverlay.className = 'admin-modal-overlay';
        loginOverlay.id = 'admin-login-overlay';
        loginOverlay.innerHTML = `
            <div class="admin-modal" data-lenis-prevent="true">
                <h2>Admin Login</h2>
                <div class="form-group">
                    <label>Email ID</label>
                    <input type="email" id="admin-email" placeholder="Enter admin email..." />
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="admin-pass" placeholder="Enter password..." />
                </div>
                <div class="admin-error" id="admin-login-error">Invalid credentials.</div>
                <button class="btn" id="admin-login-submit">Login</button>
                <button class="btn btn-close" id="admin-login-close">Cancel</button>
            </div>
        `;
        document.body.appendChild(loginOverlay);

        // Dashboard Modal
        const dashOverlay = document.createElement('div');
        dashOverlay.className = 'admin-modal-overlay';
        dashOverlay.id = 'admin-dash-overlay';
        
        let fieldsHtml = this.fields.map(f => {
            if (f.type === 'list') {
                return `
                    <div class="form-group" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <label>${f.label}</label>
                        <div id="admin-list-${f.id}" class="admin-list-container"></div>
                        <button class="btn btn-small btn-close" id="admin-add-${f.id}">+ Add New Item</button>
                    </div>
                `;
            } else if (f.type === 'projects') {
                return `
                    <div class="form-group" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <label>${f.label}</label>
                        <div id="admin-list-${f.id}" class="admin-list-container"></div>
                        <button class="btn btn-small btn-close" id="admin-add-${f.id}" style="background: rgba(255,68,0,0.1); border-color: rgba(255,68,0,0.3); color: #fff;">+ Add New Project</button>
                    </div>
                `;
            } else if (f.type === 'certificates') {
                return `
                    <div class="form-group" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <label>${f.label}</label>
                        <div id="admin-list-${f.id}" class="admin-list-container"></div>
                        <button class="btn btn-small btn-close" id="admin-add-${f.id}" style="background: rgba(0,180,255,0.1); border-color: rgba(0,180,255,0.3); color: #fff;">+ Add New Certificate</button>
                    </div>
                `;
            } else if (f.type === 'education') {
                return `
                    <div class="form-group" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <label>${f.label}</label>
                        <div id="admin-list-${f.id}" class="admin-list-container"></div>
                        <button class="btn btn-small btn-close" id="admin-add-${f.id}" style="background: rgba(0,255,100,0.1); border-color: rgba(0,255,100,0.3); color: #fff;">+ Add Education Module</button>
                    </div>
                `;
            } else if (f.type === 'contact') {
                return `
                    <div class="form-group" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <label>${f.label}</label>
                        <div id="admin-list-${f.id}" class="admin-list-container"></div>
                        <button class="btn btn-small btn-close" id="admin-add-${f.id}" style="background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); color: #fff;">+ Add Custom Contact App</button>
                    </div>
                `;
            } else if (f.type === 'fileUpload') {
                return `
                    <div class="form-group" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <label>${f.label}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="file" id="admin-file-${f.id}" accept=".pdf,.doc,.docx" style="display: none;">
                            <button class="btn btn-small btn-close" id="admin-btn-${f.id}" style="background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); color: #fff; margin-top: 0; white-space: nowrap;">📄 Upload File</button>
                            <input type="text" id="admin-input-${f.id}" placeholder="Active CV File" style="flex: 1;" readonly disabled>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="form-group">
                        <label>${f.label}</label>
                        <textarea id="admin-input-${f.id}" rows="${f.rows || 2}"></textarea>
                    </div>
                `;
            }
        }).join('');

        dashOverlay.innerHTML = `
            <div class="admin-modal" style="max-width: 650px;" data-lenis-prevent="true">
                <h2>Content Dashboard</h2>
                <p style="color: #aaa; font-size: 0.85rem; margin-bottom: 1.5rem;">Edit your site's text visually. Changes save to your browser.</p>
                <div id="admin-fields-container">
                    ${fieldsHtml}
                </div>
                <button class="btn" id="admin-save-btn">Apply & Save Changes</button>
                <button class="btn btn-close" id="admin-dash-close">Close Dashboard</button>
                <button class="btn btn-close" id="admin-logout-btn" style="border-color: #ff4444; color: #ff4444;">Logout</button>
            </div>
        `;
        document.body.appendChild(dashOverlay);
    },

    bindEvents() {
        const openBtn = document.getElementById('admin-open-btn');
        const loginOverlay = document.getElementById('admin-login-overlay');
        const dashOverlay = document.getElementById('admin-dash-overlay');

        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.body.style.overflow = 'hidden';
                if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
                    this.populateDashboard();
                    dashOverlay.classList.add('active');
                } else {
                    loginOverlay.classList.add('active');
                }
            });
        }

        // Login Logic
        document.getElementById('admin-login-submit').addEventListener('click', () => {
            const email = document.getElementById('admin-email').value.trim().toLowerCase();
            const pass = document.getElementById('admin-pass').value.trim().toLowerCase();
            const err = document.getElementById('admin-login-error');

            const validEmail = this.credentials.email.toLowerCase();
            const validPass = this.credentials.pass.toLowerCase();

            if (email === validEmail && pass === validPass) {
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                err.style.display = 'none';
                loginOverlay.classList.remove('active');
                this.populateDashboard();
                dashOverlay.classList.add('active');
            } else {
                err.style.display = 'block';
            }
        });

        document.getElementById('admin-login-close').addEventListener('click', () => {
            loginOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Dashboard Logic
        document.getElementById('admin-dash-close').addEventListener('click', () => {
            dashOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        document.getElementById('admin-logout-btn').addEventListener('click', () => {
            sessionStorage.removeItem('isAdminLoggedIn');
            dashOverlay.classList.remove('active');
            document.body.style.overflow = '';
            document.getElementById('admin-email').value = '';
            document.getElementById('admin-pass').value = '';
        });

        document.getElementById('admin-save-btn').addEventListener('click', () => {
            this.saveChanges();
            dashOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    },

    addListRow(fieldId, container, item) {
        const row = document.createElement('div');
        row.className = 'admin-list-row';
        row.innerHTML = `
            <input type="text" class="list-input-name" placeholder="Skill Name..." value="${item.name.replace(/"/g, '&quot;')}" />
            <input type="text" class="list-input-desc" placeholder="Hover Description..." value="${item.desc ? item.desc.replace(/"/g, '&quot;') : ''}" />
            <button class="btn-delete-row">X</button>
        `;
        row.querySelector('.btn-delete-row').onclick = (e) => {
            e.preventDefault();
            row.remove();
        };
        container.appendChild(row);
    },

    addProjectRow(fieldId, container, item) {
        const row = document.createElement('div');
        row.className = 'admin-project-row';
        row.style = "background: rgba(0,0,0,0.5); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1); position: relative;";
        
        row.innerHTML = `
            <button class="btn-delete-row" style="position: absolute; right: 10px; top: 10px;">X</button>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <input type="text" class="proj-input-num" placeholder="01" value="${item.num || ''}" style="flex: 0.2; width: 60px;">
                <input type="text" class="proj-input-name" placeholder="Project Name" value="${(item.name||'').replace(/"/g, '&quot;')}" style="flex: 0.8; width: 100%;">
            </div>
            <textarea class="proj-input-desc" placeholder="Project Description (Press enter for new paragraphs)..." rows="3" style="margin-bottom: 0.5rem; width: 100%; resize: vertical;">${item.desc || ''}</textarea>
            <div style="display: flex; gap: 0.5rem;">
                <input type="text" class="proj-input-tech" placeholder="Tech (comma separated, e.g. React, Python)" value="${(item.tech||'').replace(/"/g, '&quot;')}" style="flex: 0.5; width: 100%;">
                <input type="text" class="proj-input-github" placeholder="GitHub Link (Optional)" value="${(item.github||'').replace(/"/g, '&quot;')}" style="flex: 0.5; width: 100%;">
            </div>
        `;
        row.querySelector('.btn-delete-row').onclick = (e) => {
            e.preventDefault();
            row.remove();
        };
        container.appendChild(row);
    },

    addCertRow(fieldId, container, item) {
        const row = document.createElement('div');
        row.className = 'admin-cert-row';
        row.style = "background: rgba(0,0,0,0.5); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1); position: relative;";
        
        row.innerHTML = `
            <button class="btn-delete-row" style="position: absolute; right: 10px; top: 10px;">X</button>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <input type="text" class="cert-input-label" placeholder="01" value="${item.label || ''}" style="flex: 0.15; width: 60px;">
                <input type="text" class="cert-input-title" placeholder="Certificate Title..." value="${(item.title||'').replace(/"/g, '&quot;')}" style="flex: 0.85; width: 100%;">
            </div>
            <textarea class="cert-input-desc" placeholder="Certificate Description..." rows="2" style="margin-bottom: 0.5rem; width: 100%; resize: vertical;">${item.desc || ''}</textarea>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-start;">
                <input type="text" class="cert-input-url" style="display: none;" value="${(item.url||'#').replace(/"/g, '&quot;')}">
                <input type="text" class="cert-input-preview" style="display: none;" value="${(item.previewSrc||'').replace(/"/g, '&quot;')}">
                
                <input type="file" class="cert-file-upload" accept=".png, .jpg, .jpeg, .pdf" style="display: none;">
                <button class="btn btn-small btn-upload-cert" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 6px; cursor: pointer; padding: 0.6rem 1rem; font-size: 0.85rem;">📄 Upload Certificate File</button>
            </div>
        `;
        
        const fileInput = row.querySelector('.cert-file-upload');
        const uploadBtn = row.querySelector('.btn-upload-cert');
        const previewInput = row.querySelector('.cert-input-preview');
        
        uploadBtn.onclick = (e) => {
            e.preventDefault();
            fileInput.click();
        };
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // Check if file is too large to prevent LocalStorage crashing (limit to ~1MB)
                if (file.size > 1500000) {
                    alert('File is too large! Please upload an image/pdf under 1.5MB to save browser memory.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewInput.value = event.target.result;
                    uploadBtn.style.background = 'rgba(0, 255, 100, 0.2)';
                    uploadBtn.innerText = '✅ Uploaded';
                };
                reader.readAsDataURL(file);
            }
        };

        row.querySelector('.btn-delete-row').onclick = (e) => {
            e.preventDefault();
            row.remove();
        };
        container.appendChild(row);
    },

    addEduRow(fieldId, container, item) {
        const row = document.createElement('div');
        row.className = 'admin-edu-row';
        row.style = "background: rgba(0,0,0,0.5); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1); position: relative;";
        
        row.innerHTML = `
            <button class="btn-delete-row" style="position: absolute; right: 10px; top: 10px;">X</button>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <input type="text" class="edu-input-num" placeholder="01" value="${item.num || ''}" style="flex: 0.15; width: 60px;">
                <input type="text" class="edu-input-name" placeholder="Institution Name" value="${(item.name||'').replace(/"/g, '&quot;')}" style="flex: 0.85; width: 100%;">
            </div>
            <input type="text" class="edu-input-degree" placeholder="Degree Name" value="${(item.degree||'').replace(/"/g, '&quot;')}" style="margin-bottom: 0.5rem; width: 100%;">
            <div style="display: flex; gap: 0.5rem;">
                <input type="text" class="edu-input-year" placeholder="Year (e.g. Aug '24 - Aug '27)" value="${(item.year||'').replace(/"/g, '&quot;')}" style="flex: 0.33; width: 100%;">
                <input type="text" class="edu-input-score" placeholder="CGPA/Percentage" value="${(item.score||'').replace(/"/g, '&quot;')}" style="flex: 0.33; width: 100%;">
                <input type="text" class="edu-input-loc" placeholder="Location" value="${(item.loc||'').replace(/"/g, '&quot;')}" style="flex: 0.33; width: 100%;">
            </div>
        `;
        row.querySelector('.btn-delete-row').onclick = (e) => {
            e.preventDefault();
            row.remove();
        };
        container.appendChild(row);
    },

    addContactRow(fieldId, container, item) {
        const row = document.createElement('div');
        row.className = 'admin-contact-row';
        row.style = "display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: stretch;";
        
        row.innerHTML = `
            <input type="text" class="contact-input-name" placeholder="App Name (e.g. 📧 Email)" value="${(item.name||'').replace(/"/g, '&quot;')}" style="flex: 0.4; padding: 0.6rem;">
            <input type="text" class="contact-input-link" placeholder="App Link URL (e.g. mailto:xyz or https://)" value="${(item.link||'').replace(/"/g, '&quot;')}" style="flex: 0.6; padding: 0.6rem;">
            <button class="btn-delete-row">X</button>
        `;
        row.querySelector('.btn-delete-row').onclick = (e) => {
            e.preventDefault();
            row.remove();
        };
        container.appendChild(row);
    },

    getCurrentData() {
        let data = localStorage.getItem('portfolioContent');
        return data ? JSON.parse(data) : {};
    },

    populateDashboard() {
        const data = this.getCurrentData();
        this.fields.forEach(f => {
            if (f.type === 'list') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    container.innerHTML = '';
                    let items = [];
                    if (data[f.id]) {
                        items = data[f.id];
                    } else {
                        const el = document.querySelector(f.selector);
                        if (el && f.id === 'skills') {
                            const spans = el.querySelectorAll('.keyword');
                            spans.forEach(s => {
                                items.push({
                                    name: s.textContent.trim(),
                                    desc: s.getAttribute('data-hover-desc') || ''
                                });
                            });
                        }
                    }
                    items.forEach((item) => {
                        this.addListRow(f.id, container, item);
                    });
                    
                    const addBtn = document.getElementById(`admin-add-${f.id}`);
                    addBtn.onclick = (e) => {
                        e.preventDefault();
                        this.addListRow(f.id, container, { name: '', desc: '' });
                    };
                }
            } else if (f.type === 'projects') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    container.innerHTML = '';
                    let items = [];
                    if (data[f.id]) {
                        items = data[f.id];
                    } else {
                        const el = document.querySelector(f.selector);
                        if (el && f.id === 'projects') {
                            const cards = el.querySelectorAll('.project-card');
                            cards.forEach(c => {
                                const num = c.querySelector('.bg-number') ? c.querySelector('.bg-number').textContent.trim() : '';
                                const name = c.querySelector('h2') ? c.querySelector('h2').textContent.trim() : '';
                                const descParagraphs = c.querySelectorAll('.project-info p');
                                const desc = Array.from(descParagraphs).map(p => p.textContent.trim()).join('\n\n');
                                const techElements = c.querySelectorAll('.project-tech span');
                                const tech = Array.from(techElements).map(s => s.textContent.trim()).join(', ');
                                const githubLink = c.querySelector('.github-link');
                                const github = githubLink ? githubLink.href : '';
                                
                                items.push({ num, name, desc, tech, github });
                            });
                        }
                    }
                    items.forEach((item) => {
                        this.addProjectRow(f.id, container, item);
                    });
                    
                    const addBtn = document.getElementById(`admin-add-${f.id}`);
                    addBtn.onclick = (e) => {
                        e.preventDefault();
                        this.addProjectRow(f.id, container, { num: '', name: '', desc: '', tech: '', github: '' });
                    };
                }
            } else if (f.type === 'certificates') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    container.innerHTML = '';
                    let items = [];
                    if (data[f.id]) {
                        items = data[f.id];
                    } else {
                        // Default payload mirror from script.js fallback
                        items = [
                            { label: '01', title: '• Privacy and Security in Online social media by NPTEL', desc: 'Gained knowledge of privacy risks, data protection, and security practices in online social media platforms.', url: '#', previewSrc: '01.png' },
                            { label: '02', title: '• DSA Summer Bootcamp From Basics To Brillance', desc: 'Trained in data structures and algorithms with a focus on problem solving and coding efficiency.', url: '#', previewSrc: '02.png' },
                            { label: '03', title: '• Interpersonal Communication for Engineering Leaders', desc: 'Developed effective communication, teamwork, and leadership skills for professional engineering environments.', url: '#', previewSrc: '03.pdf' }
                        ];
                    }
                    items.forEach((item) => {
                        this.addCertRow(f.id, container, item);
                    });
                    
                    const addBtn = document.getElementById(`admin-add-${f.id}`);
                    addBtn.onclick = (e) => {
                        e.preventDefault();
                        this.addCertRow(f.id, container, { label: '', title: '', desc: '', url: '#', previewSrc: '' });
                    };
                }
            } else if (f.type === 'education') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    container.innerHTML = '';
                    let items = [];
                    if (data[f.id]) {
                        items = data[f.id];
                    } else {
                        const el = document.querySelector(f.selector);
                        if (el && f.id === 'education') {
                            const timelineItems = el.querySelectorAll('.timeline-item');
                            timelineItems.forEach(c => {
                                const num = c.querySelector('.node') ? c.querySelector('.node').textContent.trim() : '';
                                const name = c.querySelector('h4') ? c.querySelector('h4').textContent.trim() : '';
                                const degree = c.querySelector('p') ? c.querySelector('p').textContent.trim() : '';
                                const tagEls = c.querySelectorAll('.tag');
                                const year = tagEls.length > 0 ? tagEls[0].textContent.trim() : '';
                                const score = tagEls.length > 1 ? tagEls[1].textContent.trim() : '';
                                const loc = tagEls.length > 2 ? tagEls[2].textContent.trim() : '';
                                
                                items.push({ num, name, degree, year, score, loc });
                            });
                        }
                    }
                    items.forEach((item) => {
                        this.addEduRow(f.id, container, item);
                    });
                    
                    const addBtn = document.getElementById(`admin-add-${f.id}`);
                    addBtn.onclick = (e) => {
                        e.preventDefault();
                        this.addEduRow(f.id, container, { num: '', name: '', degree: '', year: '', score: '', loc: '' });
                    };
                }
            } else if (f.type === 'contact') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    container.innerHTML = '';
                    let items = [];
                    if (data[f.id]) {
                        items = data[f.id];
                    } else {
                        const el = document.querySelector(f.selector);
                        if (el && f.id === 'contact') {
                            const links = el.querySelectorAll('.contact-link');
                            links.forEach(a => {
                                items.push({
                                    name: a.textContent.trim(),
                                    link: a.getAttribute('href') || ''
                                });
                            });
                        }
                    }
                    items.forEach((item) => {
                        this.addContactRow(f.id, container, item);
                    });
                    
                    const addBtn = document.getElementById(`admin-add-${f.id}`);
                    addBtn.onclick = (e) => {
                        e.preventDefault();
                        this.addContactRow(f.id, container, { name: '', link: '' });
                    };
                }
            } else if (f.type === 'fileUpload') {
                const input = document.getElementById(`admin-input-${f.id}`);
                const fileInput = document.getElementById(`admin-file-${f.id}`);
                const btn = document.getElementById(`admin-btn-${f.id}`);
                if (input && fileInput && btn) {
                    if (data[f.id]) {
                        input.value = data[f.id].name;
                    } else {
                        const el = document.querySelector(f.selector);
                        input.value = el ? el.getAttribute('download') : 'None';
                    }
                    
                    btn.onclick = (e) => {
                        e.preventDefault();
                        fileInput.click();
                    };
                    
                    fileInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            if (file.size > 2500000) {
                                alert('Please upload a file smaller than 2.5MB to maintain fast browser performance.');
                                return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                input.dataset.base64 = event.target.result;
                                input.value = file.name;
                                btn.style.background = 'rgba(0,255,100,0.2)';
                                btn.innerText = '✅ Uploaded';
                            };
                            reader.readAsDataURL(file);
                        }
                    };
                }
            } else {
                const input = document.getElementById(`admin-input-${f.id}`);
                if (input) {
                    if (data[f.id] !== undefined) {
                        input.value = data[f.id];
                    } else {
                        const el = document.querySelector(f.selector);
                        if (el && f.isAbout) {
                            const pTags = el.querySelectorAll('p');
                            input.value = Array.from(pTags).map(p => p.textContent.trim()).join('\n\n');
                        } else {
                            input.value = el ? el.innerHTML.trim() : '';
                        }
                    }
                }
            }
        });
    },

    saveChanges() {
        const data = this.getCurrentData();
        this.fields.forEach(f => {
            if (f.type === 'list') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    const rows = container.querySelectorAll('.admin-list-row');
                    const items = [];
                    rows.forEach(r => {
                        items.push({
                            name: r.querySelector('.list-input-name').value,
                            desc: r.querySelector('.list-input-desc').value
                        });
                    });
                    data[f.id] = items;
                }
            } else if (f.type === 'projects') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    const rows = container.querySelectorAll('.admin-project-row');
                    const items = [];
                    rows.forEach(r => {
                        items.push({
                            num: r.querySelector('.proj-input-num').value,
                            name: r.querySelector('.proj-input-name').value,
                            desc: r.querySelector('.proj-input-desc').value,
                            tech: r.querySelector('.proj-input-tech').value,
                            github: r.querySelector('.proj-input-github').value
                        });
                    });
                    data[f.id] = items;
                }
            } else if (f.type === 'certificates') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    const rows = container.querySelectorAll('.admin-cert-row');
                    const items = [];
                    rows.forEach(r => {
                        items.push({
                            label: r.querySelector('.cert-input-label').value,
                            title: r.querySelector('.cert-input-title').value,
                            desc: r.querySelector('.cert-input-desc').value,
                            url: r.querySelector('.cert-input-url').value,
                            previewSrc: r.querySelector('.cert-input-preview').value
                        });
                    });
                    data[f.id] = items;
                }
            } else if (f.type === 'education') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    const rows = container.querySelectorAll('.admin-edu-row');
                    const items = [];
                    rows.forEach(r => {
                        items.push({
                            num: r.querySelector('.edu-input-num').value,
                            name: r.querySelector('.edu-input-name').value,
                            degree: r.querySelector('.edu-input-degree').value,
                            year: r.querySelector('.edu-input-year').value,
                            score: r.querySelector('.edu-input-score').value,
                            loc: r.querySelector('.edu-input-loc').value
                        });
                    });
                    data[f.id] = items;
                }
            } else if (f.type === 'contact') {
                const container = document.getElementById(`admin-list-${f.id}`);
                if (container) {
                    const rows = container.querySelectorAll('.admin-contact-row');
                    const items = [];
                    rows.forEach(r => {
                        items.push({
                            name: r.querySelector('.contact-input-name').value,
                            link: r.querySelector('.contact-input-link').value
                        });
                    });
                    data[f.id] = items;
                }
            } else if (f.type === 'fileUpload') {
                const input = document.getElementById(`admin-input-${f.id}`);
                if (input && input.dataset.base64) {
                    data[f.id] = { name: input.value, data: input.dataset.base64 };
                }
            } else {
                const input = document.getElementById(`admin-input-${f.id}`);
                if (input) {
                    data[f.id] = input.value;
                }
            }
        });
        localStorage.setItem('portfolioContent', JSON.stringify(data));
        
        // Reload page to re-trigger GSAP animations natively with the newly written elements
        window.location.reload();
    },

    hydrateContent() {
        const data = this.getCurrentData();
        if (Object.keys(data).length === 0) return;

        this.fields.forEach(f => {
            if (data[f.id] !== undefined) {
                const el = document.querySelector(f.selector);
                if (el) {
                    if (f.type === 'list' && Array.isArray(data[f.id])) {
                        if (f.id === 'skills') {
                            const sClasses = ['s1', 's2', 's3', 's4'];
                            const weights = [300, 400, 500, 600, 700];
                            
                            const html = data[f.id].map((item, i) => {
                                const s = sClasses[i % sClasses.length];
                                const w = weights[i % weights.length];
                                const op = (0.4 + (Math.random() * 0.6)).toFixed(2);
                                return `<span class="keyword ${s} reveal-item" data-hover-img="" data-hover-title="${item.name.replace(/"/g, '&quot;')}" data-hover-desc="${item.desc.replace(/"/g, '&quot;')}" style="font-weight: ${w}; opacity: ${op};">${item.name}</span>`;
                            }).join('');
                            el.innerHTML = html;
                        }
                    } else if (f.type === 'projects' && Array.isArray(data[f.id])) {
                        if (f.id === 'projects') {
                            let html = '<h3 class="section-title reveal-text">FEATURED WORK</h3>';
                            
                            data[f.id].forEach((item, idx) => {
                                if (idx > 0) {
                                    html += `
                                        <div class="svg-divider reveal-item" style="margin: 4rem 0;">
                                            <svg viewBox="0 0 100 20" preserveAspectRatio="none">
                                                <path d="M0,10 Q25,20 50,10 T100,10" fill="none" class="stroke-path" style="stroke: rgba(255,255,255,0.1); stroke-width: 1;" />
                                            </svg>
                                        </div>
                                    `;
                                }
                                
                                const descHtml = item.desc.split(/\n\s*\n/).filter(p=>p.trim()!=='').map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
                                const techArr = item.tech.split(',').map(t => t.trim()).filter(Boolean);
                                const techHtml = techArr.length > 0 ? `<div class="project-tech">${techArr.map(t => `<span>${t}</span>`).join(' &middot; ')}</div>` : '';
                                
                                const githubHtml = item.github ? `<div style="margin-top: 1.5rem;"><a href="${item.github}" target="_blank" class="github-link"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> View on GitHub</a></div>` : '';
    
                                html += `
                                    <div class="project-card reveal-item">
                                        <div class="bg-number" data-speed="0.8">${item.num}</div>
                                        <div class="project-info">
                                            <div class="project-meta"><span>[PRJ-${item.num}]</span><span>2024</span></div>
                                            <h2>${item.name}</h2>
                                            ${descHtml}
                                            ${techHtml}
                                            ${githubHtml}
                                        </div>
                                    </div>
                                `;
                            });
                            el.innerHTML = html;
                        }
                    } else if (f.type === 'education' && Array.isArray(data[f.id])) {
                        if (f.id === 'education') {
                            const html = data[f.id].map(item => `
                                <div class="timeline-item reveal-item">
                                    <div class="node">${item.num}</div>
                                    <div class="item-content">
                                        <h4>${item.name}</h4>
                                        <p>${item.degree}</p>
                                        <div class="tags">
                                            ${item.year ? `<span class="tag">${item.year}</span>` : ''}
                                            ${item.score ? `<span class="tag">${item.score}</span>` : ''}
                                            ${item.loc ? `<span class="tag">${item.loc}</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('');
                            el.innerHTML = html;
                        }
                    } else if (f.type === 'contact' && Array.isArray(data[f.id])) {
                        if (f.id === 'contact') {
                            const html = data[f.id].map(item => `
                                <a href="${item.link}" ${item.link.startsWith('http') ? 'target="_blank"' : ''} class="contact-link">${item.name}</a>
                            `).join('');
                            el.innerHTML = html;
                        }
                    } else if (f.type === 'fileUpload') {
                        if (data[f.id] && data[f.id].data) {
                            el.href = data[f.id].data;
                            el.download = data[f.id].name;
                        }
                    } else if (f.type === 'certificates') {
                        // script.js natively manages this HTML dynamically from standard script scope. No direct HTML hydration required.
                    } else if (f.isAbout) {
                        const paragraphs = data[f.id].split('\n').filter(p => p.trim() !== '');
                        el.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('<br>');
                    } else {
                        el.innerHTML = data[f.id];
                    }
                    
                    // Also update mailto links if it is the email
                    if(f.id === 'contactEmail' && el.tagName === 'A') {
                        el.href = `mailto:${data[f.id]}`;
                    }
                }
            }
        });
    }
};

// Instantly hydrate the HTML content *before* any other scripts (like GSAP) initialize
AdminPanel.hydrateContent();

window.addEventListener('DOMContentLoaded', () => {
    AdminPanel.init();
});
