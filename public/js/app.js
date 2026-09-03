// BizStrives Frontend JavaScript
// Utility functions and modal handling

(function() {
  'use strict';

  // Close modals when clicking outside
  document.querySelectorAll('.fixed > div').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // Form validation helpers
  function validateForm(form) {
    const required = form.querySelectorAll('[required]');
    let valid = true;
    required.forEach(input => {
      if (!input.value.trim()) {
        input.classList.add('border-red-300');
        valid = false;
      } else {
        input.classList.remove('border-red-300');
      }
    });
    return valid;
  }

  // Format currency
  function formatCurrency(amountCents) {
    const amount = amountCents / 100;
    return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Date formatter
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-NG', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Export for other scripts
  window BizStrives = {
    formatCurrency,
    formatDate,
    validateForm
  };
})();