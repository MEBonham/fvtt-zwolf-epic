/**
 * Register custom Handlebars helpers for Z-Wolf Epic
 */

export function registerHandlebarsHelpers() {
  
  // String manipulation
  Handlebars.registerHelper('concat', function() {
    let outStr = '';
    for (let arg in arguments) {
      if (typeof arguments[arg] !== 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('capitalize', function(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper('extractNumber', function(str) {
    return str.replace(/\D/g, '');
  });

  Handlebars.registerHelper('contains', function(string, substring) {
    if (typeof string !== 'string' || typeof substring !== 'string') {
      return false;
    }
    return string.includes(substring);
  });

  // Array manipulation
  Handlebars.registerHelper('join', function(array, separator) {
    if (!array) return '';
    if (!Array.isArray(array)) return String(array);
    
    separator = separator || ', ';
    
    const cleanArray = array
      .filter(item => item !== null && item !== undefined)
      .map(item => {
        const str = String(item);
        if (str.includes('[object Object]')) {
          const parts = str.split('[object Object]').filter(part => part.trim().length > 0);
          return parts.join(', ');
        }
        return str;
      })
      .filter(str => str.length > 0);
      
    return cleanArray.join(separator);
  });

  Handlebars.registerHelper('includes', function(array, value) {
    if (!array || !Array.isArray(array)) return false;
    return array.includes(value);
  });

  Handlebars.registerHelper('range', function(start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });

  // Comparison operators
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper('gte', function(a, b) {
    return a >= b;
  });

  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });

  Handlebars.registerHelper('lte', function(a, b) {
    return a <= b;
  });

  Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  });

  // Math operations
  Handlebars.registerHelper('add', function(a, b) {
    return parseInt(a) + parseInt(b);
  });

  Handlebars.registerHelper('math', function(lvalue, operator, rvalue) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);
    
    return {
      '+': lvalue + rvalue,
      '-': lvalue - rvalue,
      '*': lvalue * rvalue,
      '/': lvalue / rvalue,
      '%': lvalue % rvalue
    }[operator];
  });

  Handlebars.registerHelper('mod', function(a, b) {
    return a % b;
  });

  // Form helpers
  Handlebars.registerHelper('selected', function(option, value) {
    return (option === value) ? 'selected' : '';
  });

  Handlebars.registerHelper('checked', function(value) {
    return value ? 'checked' : '';
  });

  // Object/data access
  Handlebars.registerHelper('lookup', function(obj, key) {
    return obj[key];
  });

  Handlebars.registerHelper('json', function(obj) {
    return JSON.stringify(obj);
  });

  Handlebars.registerHelper('getSourceItem', function(item) {
    return item.getSourceItem?.();
  });
}
