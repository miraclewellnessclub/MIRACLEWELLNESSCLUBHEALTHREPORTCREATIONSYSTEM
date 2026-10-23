/**
 * pdf.js - Handles PDF generation and QR Code creation
 */

const PDFGenerator = {
    // Current rendered QR code instance
    qrCodeInstance: null,

    // Download PDF
    downloadPDF: async function(report, filename, skipDownload = false) {
        // We use html2canvas to take a snapshot of the report-content element
        const reportElement = document.getElementById('report-content');
        if (!reportElement) {
            console.error("Report content element not found.");
            return;
        }

        try {
            // Temporarily modify styles for better PDF output if needed
            const originalBackground = reportElement.style.background;
            const hasGlassPanel = reportElement.classList.contains('glass-panel');
            const isDarkMode = document.body.classList.contains('dark-mode');
            
            reportElement.style.background = 'white';
            
            if (isDarkMode) {
                document.body.classList.remove('dark-mode');
            }
            if (hasGlassPanel) {
                reportElement.classList.remove('glass-panel'); // Remove backdrop-filter to prevent rendering issues
            }

            // Ensure we are at the top to prevent html2canvas cutoff bugs
            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);

            const canvas = await html2canvas(reportElement, {
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false,
                scrollY: 0
            });

            // Restore scroll position
            window.scrollTo(0, originalScrollY);

            // Restore original style
            reportElement.style.background = originalBackground;
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
            }
            if (hasGlassPanel) {
                reportElement.classList.add('glass-panel');
            }

            const imgData = canvas.toDataURL('image/jpeg', 0.75);
            
            // Calculate PDF dimensions (A4 size)
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // If the content is longer than one A4 page, scale it down to fit
            let finalWidth = pdfWidth;
            let finalHeight = pdfHeight;
            if (pdfHeight > pageHeight) {
                finalHeight = pageHeight;
                finalWidth = (canvas.width * pageHeight) / canvas.height;
            }

            const xOffset = (pdfWidth - finalWidth) / 2;

            pdf.addImage(imgData, 'JPEG', xOffset, 0, finalWidth, finalHeight);
            
            // Save the PDF locally
            if (!skipDownload) {
                pdf.save(filename || `Miracle_Wellness_Report_${report.id}.pdf`);
            }
            
            // Upload to Supabase Storage with Timeout
            try {
                if (!window.supabaseClient || !window.supabaseClient.storage) {
                    console.warn("Supabase Storage is not configured. Report PDF saved locally only.");
                    return null;
                }

                const uploadTask = async () => {
                    const pdfBlob = pdf.output('blob');
                    const fileName = `${report.id}_${Date.now()}.pdf`;
                    
                    // Upload to 'reports' bucket
                    const { data, error } = await window.supabaseClient.storage
                        .from('reports')
                        .upload(fileName, pdfBlob, {
                            contentType: 'application/pdf'
                        });
                        
                    if (error) {
                        console.error("Supabase error:", error);
                        throw error;
                    }
                    
                    // Get public URL
                    const { data: urlData } = window.supabaseClient.storage
                        .from('reports')
                        .getPublicUrl(fileName);
                        
                    return urlData.publicUrl;
                };

                const timeoutTask = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Upload Timeout - Check Network or Supabase Rules")), 8000);
                });

                const downloadURL = await Promise.race([uploadTask(), timeoutTask]);
                return downloadURL;
            } catch (err) {
                console.warn("Supabase upload failed:", err);
                return null;
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            throw error;
        }
    }
};
