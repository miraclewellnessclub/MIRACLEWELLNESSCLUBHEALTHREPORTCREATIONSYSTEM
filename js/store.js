/**
 * store.js - Handles Local Storage operations for Miracle Wellness Club
 */

const STORE_KEY = 'miracle_wellness_reports';

const Store = {
    // Get all reports from local storage
    getReports: function() {
        const data = localStorage.getItem(STORE_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Error parsing reports from local storage:", e);
            return [];
        }
    },

    // Get a specific report by ID
    getReportById: function(id) {
        const reports = this.getReports();
        return reports.find(r => r.id === id);
    },

    // Save a new report or update an existing one
    saveReport: function(report) {
        const reports = this.getReports();
        
        // Ensure report has an ID and timestamp
        if (!report.id) {
            report.id = 'REP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
        }
        if (!report.createdAt) {
            report.createdAt = new Date().toISOString();
        }

        const existingIndex = reports.findIndex(r => r.id === report.id);
        if (existingIndex >= 0) {
            reports[existingIndex] = report;
        } else {
            reports.push(report);
        }
        
        // Sort by newest first
        reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        localStorage.setItem(STORE_KEY, JSON.stringify(reports));
        return report;
    },

    // Delete a report
    deleteReport: function(id) {
        let reports = this.getReports();
        reports = reports.filter(r => r.id !== id);
        localStorage.setItem(STORE_KEY, JSON.stringify(reports));
    },

    // Search reports by name or mobile
    searchReports: function(query) {
        if (!query) return this.getReports();
        
        query = query.toLowerCase();
        const reports = this.getReports();
        return reports.filter(r => 
            (r.fullName && r.fullName.toLowerCase().includes(query)) ||
            (r.mobile && r.mobile.includes(query))
        );
    }
};
