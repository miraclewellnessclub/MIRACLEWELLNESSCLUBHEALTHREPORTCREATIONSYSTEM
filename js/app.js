/**
 * app.js - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- State & Config ---
    let currentReport = null;
    let isAuthenticated = localStorage.getItem('mw_auth') === 'true';

    // UI Elements
    const views = {
        login: document.getElementById('login-view'),
        otp: document.getElementById('otp-view'),
        dashboard: document.getElementById('dashboard-view'),
        form: document.getElementById('form-view'),
        report: document.getElementById('report-view')
    };

    // --- Utility: Show Toast ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'check-circle' : 'error-circle';
        toast.innerHTML = `<i class='bx bx-${icon}'></i> <span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- Navigation / Routing ---
    function switchView(viewName) {
        Object.values(views).forEach(view => {
            view.classList.remove('active');
            view.classList.add('hidden');
        });
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
            views[viewName].classList.add('active');
            window.scrollTo(0, 0);
        }
    }

    // --- Initial Routing ---
    if (isAuthenticated) {
        switchView('dashboard');
        loadDashboard();
        updateStorageStats();
    } else {
        switchView('login');
    }

    // --- Theme Management ---
    const themeToggles = document.querySelectorAll('.theme-toggle');
    const body = document.body;
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('mw_theme');
    if (savedTheme === 'dark') {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
    } else if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
    }
    
    // Set initial toggle icon
    const isInitiallyDark = body.classList.contains('dark-mode');
    themeToggles.forEach(t => {
        t.innerHTML = isInitiallyDark ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
    });

    themeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const isDark = body.classList.contains('dark-mode');
            
            if (isDark) {
                body.classList.remove('dark-mode');
                body.classList.add('light-mode');
                localStorage.setItem('mw_theme', 'light');
            } else {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
                localStorage.setItem('mw_theme', 'dark');
            }
            
            // Update all toggles
            const nowDark = body.classList.contains('dark-mode');
            themeToggles.forEach(t => {
                t.innerHTML = nowDark ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
            });
        });
    });

    // --- Login Logic ---
    const loginForm = document.getElementById('login-form');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordBtn.innerHTML = type === 'password' ? "<i class='bx bx-hide'></i>" : "<i class='bx bx-show'></i>";
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();

        if (user === 'miraclewellnessclub' && pass === '8473@') {
            showToast('Credentials accepted.');
            switchView('otp');
        } else {
            showToast('Invalid credentials.', 'error');
        }
    });

    // --- OTP Logic ---
    const otpInputs = document.querySelectorAll('.otp-input');
    const otpForm = document.getElementById('otp-form');

    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function (e) {
            // Auto focus next
            if (this.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            updateFullOtp();
        });

        input.addEventListener('keydown', function (e) {
            // Auto focus prev on backspace
            if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    function updateFullOtp() {
        let otp = '';
        otpInputs.forEach(input => otp += input.value);
        document.getElementById('full-otp').value = otp;
    }

    otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const otp = document.getElementById('full-otp').value.trim();
        if (otp === '2018') {
            localStorage.setItem('mw_auth', 'true');
            isAuthenticated = true;
            showToast('Login successful!');
            switchView('dashboard');
            loadDashboard();
            updateStorageStats();
        } else {
            showToast('Invalid OTP.', 'error');
        }
    });

    document.getElementById('btn-back-login').addEventListener('click', () => {
        switchView('login');
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('mw_auth');
        isAuthenticated = false;
        switchView('login');
        showToast('Logged out successfully.');
    });

    // --- Storage Monitoring Logic ---
    async function updateStorageStats() {
        try {
            const MAX_STORAGE_MB = 1024;
            let totalBytes = 0;
            let fileCount = 0;

            // 1. Try fetching from Supabase Storage API directly if client exists
            async function fetchFolder(folderPath) {
                if (!window.supabaseClient || !window.supabaseClient.storage) return;
                let currentOffset = 0;
                let hasMore = true;

                while (hasMore) {
                    const { data, error } = await window.supabaseClient.storage.from('reports').list(folderPath, {
                        limit: 1000,
                        offset: currentOffset,
                        sortBy: { column: 'name', order: 'asc' },
                    });

                    if (error || !data || data.length === 0) break;

                    for (const item of data) {
                        if (item.name === '.emptyFolderPlaceholder') continue;

                        if (!item.id || !item.metadata) {
                            const subPath = folderPath ? `${folderPath}/${item.name}` : item.name;
                            await fetchFolder(subPath);
                        } else {
                            const size = item.metadata ? item.metadata.size : (item.size || 0);
                            if (size > 0 && item.name.toLowerCase().endsWith('.pdf')) {
                                totalBytes += size;
                                fileCount++;
                            }
                        }
                    }

                    if (data.length < 1000) hasMore = false;
                    else currentOffset += 1000;
                }
            }

            if (window.supabaseClient && window.supabaseClient.storage) {
                await fetchFolder('');
            }

            // 2. FALLBACK: If Supabase API returned 0 (often due to missing RLS SELECT policy on storage.objects),
            // calculate size manually using HEAD requests for known reports in localStorage.
            const allReports = Store.getReports();
            
            if (totalBytes === 0 && allReports.length > 0) {
                console.warn("Supabase list() returned empty (likely RLS policy missing). Falling back to localStorage URLs.");
                
                // Set file count to known local reports
                fileCount = allReports.length;

                // Process in chunks to avoid overwhelming the browser
                const chunkSize = 10;
                for (let i = 0; i < allReports.length; i += chunkSize) {
                    const chunk = allReports.slice(i, i + chunkSize);
                    const promises = chunk.map(async (report) => {
                        if (report.pdfUrl) {
                            try {
                                const res = await fetch(report.pdfUrl, { method: 'HEAD' });
                                if (res.ok) {
                                    const size = res.headers.get('content-length');
                                    if (size) {
                                        totalBytes += parseInt(size, 10);
                                    }
                                }
                            } catch (e) { /* ignore */ }
                        }
                    });
                    await Promise.all(promises);
                }
            } else if (fileCount === 0) {
                // If local is also empty, count is 0
                fileCount = allReports.length;
            } else {
                // If Supabase API worked, but we want to ensure we display AT LEAST the local count
                fileCount = Math.max(fileCount, allReports.length);
            }

            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            const avgSizeMB = fileCount > 0 ? (totalMB / fileCount).toFixed(2) : 0;
            const remainingMB = Math.max(0, MAX_STORAGE_MB - totalMB).toFixed(1);
            const usedPercentage = Math.min(((totalMB / MAX_STORAGE_MB) * 100).toFixed(1), 100);

            // Update DOM
            const elUsed = document.getElementById('stat-storage-used');
            if (elUsed) {
                document.getElementById('stat-total').textContent = fileCount;
                elUsed.textContent = `${totalMB} MB`;
                document.getElementById('stat-storage-available').textContent = `${remainingMB} MB`;
                document.getElementById('stat-storage-avg').textContent = `${avgSizeMB} MB`;
                
                document.getElementById('storage-percentage-text').textContent = `${usedPercentage}% Used`;
                const progressFill = document.getElementById('storage-progress-fill');
                progressFill.style.width = `${usedPercentage}%`;
                
                document.getElementById('storage-used-label').textContent = `${totalMB} MB Used`;
                document.getElementById('storage-remaining-label').textContent = `${remainingMB} MB Remaining`;

                // Reset classes
                progressFill.classList.remove('warning', 'danger');
                const warningAlert = document.getElementById('storage-warning-alert');
                if (warningAlert) {
                    warningAlert.classList.add('hidden');
                    warningAlert.classList.remove('warning', 'error');

                    if (usedPercentage >= 90) {
                        progressFill.classList.add('danger');
                        warningAlert.classList.remove('hidden');
                        warningAlert.classList.add('error');
                    } else if (usedPercentage >= 70) {
                        progressFill.classList.add('warning');
                        warningAlert.classList.remove('hidden');
                        warningAlert.classList.add('warning');
                    }
                }
            }
        } catch (err) {
            console.error("Failed to update storage stats", err);
        }
    }

    // --- Dashboard Logic ---
    const btnNewReport = document.getElementById('btn-new-report');

    // --- Backup & Restore Logic ---
    const selectAllExport = document.getElementById('select-all-export');
    if (selectAllExport) {
        selectAllExport.addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('.export-checkbox').forEach(cb => cb.checked = checked);
        });
    }

    document.getElementById('btn-export-data').addEventListener('click', () => {
        let reportsToExport = [];
        const checkedBoxes = document.querySelectorAll('.export-checkbox:checked');
        if (checkedBoxes.length > 0) {
            const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
            reportsToExport = Store.getReports().filter(r => selectedIds.includes(r.id));
        } else {
            showToast('Please select at least one report to export!', 'warning');
            return;
        }

        const dataStr = JSON.stringify(reportsToExport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `Miracle_Wellness_Backup_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        showToast('Backup exported successfully!');
        
        document.querySelectorAll('.export-checkbox').forEach(cb => cb.checked = false);
        if (selectAllExport) selectAllExport.checked = false;
    });

    document.getElementById('btn-import-data').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    let pendingImportData = [];
    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                if (Array.isArray(importedData)) {
                    pendingImportData = importedData.filter(r => r && r.id && r.createdAt);
                    if (pendingImportData.length === 0) {
                        showToast('No valid reports found in file.', 'warning');
                        return;
                    }
                    
                    const tbody = document.getElementById('import-tbody');
                    tbody.innerHTML = '';
                    pendingImportData.forEach(report => {
                        const tr = document.createElement('tr');
                        const date = new Date(report.createdAt).toLocaleDateString();
                        tr.innerHTML = `
                            <td style="text-align: center;"><input type="checkbox" class="import-checkbox" value="${report.id}" checked></td>
                            <td>${date}</td>
                            <td><strong>${report.fullName || 'N/A'}</strong></td>
                            <td>${report.mobile || 'N/A'}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                    
                    document.getElementById('select-all-import').checked = true;
                    document.getElementById('import-modal').classList.remove('hidden');
                } else {
                    showToast('Invalid backup file format.', 'error');
                }
            } catch (err) {
                showToast('Error reading backup file.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.getElementById('btn-close-import-modal').addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('hidden');
    });
    document.getElementById('btn-cancel-import').addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('hidden');
    });

    document.getElementById('select-all-import').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.import-checkbox').forEach(cb => cb.checked = checked);
    });

    document.getElementById('btn-confirm-import').addEventListener('click', () => {
        const checkedBoxes = document.querySelectorAll('.import-checkbox:checked');
        if (checkedBoxes.length === 0) {
            showToast('Please select at least one report to import.', 'warning');
            return;
        }
        const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
        const selectedReports = pendingImportData.filter(r => selectedIds.includes(r.id));
        
        const existingReports = Store.getReports();
        const existingMap = new Map();
        existingReports.forEach(r => existingMap.set(r.id, r));
        
        let importedCount = 0;
        selectedReports.forEach(r => {
            existingMap.set(r.id, r);
            importedCount++;
        });

        const mergedReports = Array.from(existingMap.values());
        localStorage.setItem('miracle_wellness_reports', JSON.stringify(mergedReports));
        
        showToast(`Imported ${importedCount} reports successfully!`);
        document.getElementById('import-modal').classList.add('hidden');
        loadDashboard();
    });

    btnNewReport.addEventListener('click', () => {
        document.getElementById('health-report-form').reset();
        document.getElementById('bmi').value = '';
        switchView('form');
    });

    document.querySelectorAll('.btn-back-dashboard').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('dashboard');
            loadDashboard();
        });
    });

    function loadDashboard(query = '') {
        const tbody = document.getElementById('reports-tbody');
        const noMsg = document.getElementById('no-reports-msg');

        const reports = Store.searchReports(query);

        // Update stats
        const allReports = Store.getReports();

        tbody.innerHTML = '';
        if (reports.length === 0) {
            tbody.parentElement.classList.add('hidden');
            noMsg.classList.remove('hidden');
        } else {
            tbody.parentElement.classList.remove('hidden');
            noMsg.classList.add('hidden');

            reports.forEach(report => {
                const tr = document.createElement('tr');
                const date = new Date(report.createdAt).toLocaleDateString();

                let scoreClass = 'text-success';
                if (report.healthScore <= 60) scoreClass = 'text-danger';
                else if (report.healthScore <= 80) scoreClass = 'text-warning';

                tr.innerHTML = `
                    <td style="text-align: center;"><input type="checkbox" class="export-checkbox" value="${report.id}"></td>
                    <td>${date}</td>
                    <td><strong>${report.fullName}</strong></td>
                    <td>${report.mobile}</td>
                    <td class="${scoreClass}" style="font-weight:bold;">${report.healthScore}</td>
                    <td>
                        <button class="icon-btn btn-view" data-id="${report.id}" title="View Report"><i class='bx bx-show'></i></button>
                        <button class="icon-btn btn-delete text-danger" data-id="${report.id}" title="Delete"><i class='bx bx-trash'></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Attach events
            document.querySelectorAll('.btn-view').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    viewReport(id);
                });
            });
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (confirm("Are you sure you want to delete this report?")) {
                        Store.deleteReport(id);
                        showToast('Report deleted');
                        loadDashboard();
                    }
                });
            });
        }
    }

    document.getElementById('search-reports').addEventListener('input', (e) => {
        loadDashboard(e.target.value);
    });

    // --- Form & Calculation Logic ---
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const bmiInput = document.getElementById('bmi');

    function calculateBMI() {
        const h = parseFloat(heightInput.value);
        const w = parseFloat(weightInput.value);
        if (h && w) {
            const hMeters = h / 100;
            const bmi = (w / (hMeters * hMeters)).toFixed(1);
            bmiInput.value = bmi;
        }
    }

    heightInput.addEventListener('input', calculateBMI);
    weightInput.addEventListener('input', calculateBMI);

    document.getElementById('health-report-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Calculate health score and evaluate ranges
        const analysis = analyzeHealth(data);

        const report = {
            ...data,
            ...analysis
        };

        const savedReport = Store.saveReport(report);
        showToast('Report generated successfully!');
        viewReport(savedReport.id);
    });

    function analyzeHealth(data) {
        let score = 100;
        let recommendations = [];
        const isMale = data.gender === 'Male';
        const age = parseInt(data.age) || 30;

        // Ranges Analysis
        let evaluatedParams = [];

        // Weight Analysis
        const currentWeight = parseFloat(data.weight);
        const heightMeters = parseFloat(data.height) / 100;
        const minWeight = 18.5 * heightMeters * heightMeters;
        const maxWeight = 24.9 * heightMeters * heightMeters;
        const idealWeight = 22 * heightMeters * heightMeters;

        let weightStatus = 'Normal';
        let weightDiffText = 'Normal';
        
        if (currentWeight > maxWeight) {
            weightStatus = 'High';
            weightDiffText = `+${(currentWeight - idealWeight).toFixed(1)} kg (Overweight)`;
        } else if (currentWeight < minWeight) {
            weightStatus = 'Low';
            weightDiffText = `-${(idealWeight - currentWeight).toFixed(1)} kg (Underweight)`;
        } else {
            weightStatus = 'Normal';
            weightDiffText = `Perfect Weight`;
        }

        evaluatedParams.push({ name: 'सध्याचे वजन (Current Weight)', val: currentWeight.toFixed(1) + ' kg', range: `${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`, status: 'Info' });
        evaluatedParams.push({ name: 'अपेक्षित वजन (Ideal Weight)', val: idealWeight.toFixed(1) + ' kg', range: `${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`, status: 'Info' });
        evaluatedParams.push({ name: 'वजनातील फरक (Weight Difference)', val: weightDiffText, range: '0 kg', status: weightStatus });

        // 1. BMI
        const bmi = parseFloat(data.bmi);
        let bmiStatus = 'Normal';
        if (bmi < 18.5) { bmiStatus = 'Underweight'; score -= 10; recommendations.push('संतुलित आहार घ्या आणि वजन वाढवण्यावर लक्ष द्या (Increase weight)'); }
        else if (bmi >= 25) { bmiStatus = 'Overweight'; score -= 15; recommendations.push('वजन नियंत्रणावर लक्ष द्या (Control your weight)'); }
        evaluatedParams.push({ name: 'BMI', val: bmi, range: '18.5 - 24.9', status: bmiStatus });

        // Add fixed recommendations
        recommendations.push('रोज सकाळी ४५ मिनिटे व्यायाम करावा');
        recommendations.push('नियमित सेहत की पाठशाला कार्यक्रम जॉईन करावा');
        recommendations.push('निरोगी जीवन जगण्यासाठी सेहत की पाठशाला जॉईन करावी');

        // 2. Total Fat
        const fat = parseFloat(data.totalFat);
        let fatNormal = isMale ? '10 - 20%' : '20 - 30%';
        let fatStatus = 'Normal';
        const maxFat = isMale ? 20 : 30;
        if (fat > maxFat) { fatStatus = 'High'; score -= 10; }
        evaluatedParams.push({ name: 'Total Fat %', val: fat, range: fatNormal, status: fatStatus });

        // 3. Visceral Fat
        const visFat = parseFloat(data.visceralFat);
        let visStatus = 'Normal';
        if (visFat > 9) { visStatus = 'High'; score -= 15; }
        evaluatedParams.push({ name: 'Visceral Fat Level', val: visFat, range: '1 - 9', status: visStatus });

        // 4. Resting Metabolism (Informational, no strict penalty here)
        evaluatedParams.push({ name: 'Resting Metabolism', val: data.restingMetabolism + ' kcal', range: 'Depends on age/weight', status: 'Info' });

        // 5. Metabolic Age
        const metaAge = parseFloat(data.metabolicAge);
        let metaStatus = 'Good';
        if (metaAge > age + 5) { metaStatus = 'High'; score -= 10; }
        evaluatedParams.push({ name: 'Metabolic Age', val: metaAge, range: `Close to ${age}`, status: metaStatus });

        // 6. Subcutaneous Fat
        const subFat = parseFloat(data.subcutaneousFat);
        evaluatedParams.push({ name: 'Subcutaneous Fat %', val: subFat, range: 'Depends on gender', status: 'Info' });

        // 7. Skeletal Muscle
        const muscle = parseFloat(data.skeletalMuscle);
        let muscleNormal = isMale ? '33 - 39%' : '24 - 30%';
        let muscleStatus = 'Normal';
        const minMuscle = isMale ? 33 : 24;
        if (muscle < minMuscle) { muscleStatus = 'Low'; score -= 10; }
        evaluatedParams.push({ name: 'Skeletal Muscle %', val: muscle, range: muscleNormal, status: muscleStatus });

        // Ensure unique recommendations and limit to max 5
        recommendations = [...new Set(recommendations)].slice(0, 5);

        // Determine Risk Level
        let riskLevel = 'Healthy';
        if (score <= 60) riskLevel = 'High Risk';
        else if (score <= 80) riskLevel = 'Moderate';

        // Clamp score
        if (score < 0) score = 0;

        return {
            healthScore: score,
            riskLevel: riskLevel,
            recommendations: recommendations,
            evaluatedParams: evaluatedParams
        };
    }

    // --- Report View Logic ---
    function viewReport(id) {
        currentReport = Store.getReportById(id);
        if (!currentReport) return;

        // Populate basic info
        document.getElementById('rep-name').textContent = currentReport.fullName;
        document.getElementById('rep-mobile').textContent = currentReport.mobile;
        document.getElementById('rep-age').textContent = currentReport.age;
        document.getElementById('rep-gender').textContent = currentReport.gender;
        document.getElementById('rep-height').textContent = currentReport.height;
        document.getElementById('rep-weight').textContent = currentReport.weight;
        document.getElementById('rep-location').textContent = currentReport.campLocation;
        document.getElementById('rep-date').textContent = currentReport.campDate;
        document.getElementById('rep-coordinator').textContent = currentReport.coordinatorName;

        // Populate Table
        const tbody = document.getElementById('rep-parameters-body');
        tbody.innerHTML = '';
        currentReport.evaluatedParams.forEach(param => {
            const tr = document.createElement('tr');
            let statusColor = 'inherit';
            if (param.status === 'High' || param.status === 'Underweight' || param.status === 'Overweight' || param.status === 'Low') {
                statusColor = 'var(--danger)';
            }
            tr.innerHTML = `
                <td>${param.name}</td>
                <td style="color:${statusColor};"><strong>${param.val}</strong></td>
                <td>${param.range}</td>
                <td style="color:${statusColor}; font-weight:500;">${param.status}</td>
            `;
            tbody.appendChild(tr);
        });

        // Populate Score
        document.getElementById('rep-score').textContent = currentReport.healthScore;
        const riskBadge = document.getElementById('rep-risk');
        riskBadge.textContent = currentReport.riskLevel;
        riskBadge.className = 'risk-badge ' + currentReport.riskLevel.toLowerCase().replace(' ', '-');

        // Populate Recommendations
        const recList = document.getElementById('rep-recommendations');
        recList.innerHTML = '';
        currentReport.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recList.appendChild(li);
        });


        switchView('report');
    }

    // --- Download PDF & Share ---
    document.getElementById('btn-download-pdf').addEventListener('click', async () => {
        if (!currentReport) return;
        const btn = document.getElementById('btn-download-pdf');
        btn.innerHTML = "<i class='bx bx-loader bx-spin'></i> Generating & Uploading...";
        btn.disabled = true;

        try {
            const url = await PDFGenerator.downloadPDF(currentReport, `${currentReport.fullName.replace(/\s+/g, '_')}_Health_Report.pdf`);
            if (url) {
                currentReport.pdfUrl = url;
                Store.saveReport(currentReport); // update storage with new URL
                showToast('PDF downloaded and uploaded successfully!');
                updateStorageStats();
            } else {
                showToast('PDF downloaded (Upload failed)', 'warning');
            }
        } catch (e) {
            showToast('Failed to generate PDF: ' + (e.message || e), 'error');
        } finally {
            btn.innerHTML = "<i class='bx bxs-file-pdf'></i> Download PDF";
            btn.disabled = false;
        }
    });

    document.getElementById('btn-share-whatsapp').addEventListener('click', async () => {
        if (!currentReport) return;

        const btn = document.getElementById('btn-share-whatsapp');
        const originalHtml = btn.innerHTML;

        if (!currentReport.pdfUrl) {
            btn.innerHTML = "<i class='bx bx-loader bx-spin'></i> Uploading...";
            btn.disabled = true;
            try {
                const url = await PDFGenerator.downloadPDF(currentReport, `${currentReport.fullName.replace(/\s+/g, '_')}_Health_Report.pdf`, true);
                if (url) {
                    currentReport.pdfUrl = url;
                    Store.saveReport(currentReport);
                    updateStorageStats();
                } else {
                    showToast('Upload failed! Please check Supabase Storage settings (Public Bucket).', 'error');
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                    return;
                }
            } catch (err) {
                showToast('Failed to generate PDF: ' + (err.message || err), 'error');
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                return;
            }
        } // Close the if block

        // Shorten the URL using TinyURL for a cleaner message
        let finalUrl = currentReport.pdfUrl;
        try {
            const shortResponse = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(finalUrl)}`);
            if (shortResponse.ok) {
                finalUrl = await shortResponse.text();
            }
        } catch (e) {
            console.error("Failed to shorten URL", e);
        }

        const msg = `नमस्कार ${currentReport.fullName} \n\nआपण Miracle Wellness Club च्या आरोग्य तपासणी शिबिरामध्ये सहभागी झाल्याबद्दल धन्यवाद.\n\nआपला वैयक्तिक आरोग्य अहवाल तयार झाला आहे.\n\n आरोग्य गुणांक : ${currentReport.healthScore}/100\n\nआपला संपूर्ण अहवाल पाहण्यासाठी खालील लिंकवर क्लिक करा.\n\n${finalUrl}\n\n निरोगी शरीर, आनंदी जीवन \n\nMiracle Wellness Club`;

        const encodedMsg = encodeURIComponent(msg);

        let mobile = currentReport.mobile;
        if (mobile && mobile.length === 10) mobile = '91' + mobile;

        const whatsappUrl = `https://wa.me/${mobile}?text=${encodedMsg}`;
        window.open(whatsappUrl, '_blank');
    });

});
