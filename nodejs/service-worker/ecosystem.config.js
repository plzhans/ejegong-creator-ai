module.exports = {
    apps: [{
        name: 'service-worker',
        script: 'dist/main.js',
        env: {
            NODE_ENV: "production"
        }
    }]
}