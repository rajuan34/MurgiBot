fetch('http://localhost:3000/api/system/metrics', {
  headers: {
    'x-admin-password': 'null'
  }
}).then(res => console.log('Status with null:', res.status));

fetch('http://localhost:3000/api/system/metrics', {
  headers: {
    'x-admin-password': ''
  }
}).then(res => console.log('Status with empty:', res.status));
