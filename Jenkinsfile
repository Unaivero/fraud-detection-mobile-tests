pipeline {
    agent any
    
    parameters {
        choice(
            name: 'PLATFORM',
            choices: ['android', 'ios', 'both'],
            description: 'Platform to test'
        )
        choice(
            name: 'ENVIRONMENT',
            choices: ['staging', 'production', 'mock'],
            description: 'Environment to test against'
        )
        booleanParam(
            name: 'PARALLEL_EXECUTION',
            defaultValue: true,
            description: 'Run tests in parallel'
        )
        string(
            name: 'TEST_TAGS',
            defaultValue: '',
            description: 'Test tags to run (optional)'
        )
    }
    
    environment {
        NODE_VERSION = '18'
        JAVA_VERSION = '11'
        ANDROID_HOME = '/opt/android-sdk'
        APPIUM_VERSION = '2.0.0'
        BUILD_NUMBER = "${BUILD_NUMBER}"
        GIT_COMMIT = "${GIT_COMMIT}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.SHORT_COMMIT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Setup Environment') {
            parallel {
                stage('Install Node.js Dependencies') {
                    steps {
                        sh '''
                            node --version
                            npm --version
                            npm ci
                        '''
                    }
                }
                
                stage('Setup Android Environment') {
                    when {
                        anyOf {
                            params.PLATFORM == 'android'
                            params.PLATFORM == 'both'
                        }
                    }
                    steps {
                        sh '''
                            echo "Setting up Android environment..."
                            $ANDROID_HOME/platform-tools/adb version
                            $ANDROID_HOME/emulator/emulator -list-avds
                        '''
                    }
                }
                
                stage('Setup iOS Environment') {
                    when {
                        anyOf {
                            params.PLATFORM == 'ios'
                            params.PLATFORM == 'both'
                        }
                    }
                    steps {
                        sh '''
                            echo "Setting up iOS environment..."
                            xcrun simctl list devices
                        '''
                    }
                }
            }
        }
        
        stage('Code Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                        publishHTML([
                            allowMissing: false,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: 'lint-report',
                            reportFiles: 'index.html',
                            reportName: 'ESLint Report'
                        ])
                    }
                }
                
                stage('Security Audit') {
                    steps {
                        sh '''
                            npm audit --audit-level moderate --json > audit-report.json || true
                            npm audit --audit-level high --production
                        '''
                        archiveArtifacts artifacts: 'audit-report.json', fingerprint: true
                    }
                }
            }
        }
        
        stage('Start Services') {
            parallel {
                stage('Start Appium Server') {
                    steps {
                        sh '''
                            npm install -g appium@${APPIUM_VERSION}
                            appium driver install uiautomator2
                            appium driver install xcuitest
                            
                            # Start Appium server in background
                            nohup appium --address 0.0.0.0 --port 4723 --relaxed-security > appium.log 2>&1 &
                            echo $! > appium.pid
                            
                            # Wait for Appium to start
                            timeout 60 bash -c 'until curl -f http://localhost:4723/wd/hub/status; do sleep 2; done'
                        '''
                    }
                }
                
                stage('Start Mock API Server') {
                    when {
                        params.ENVIRONMENT == 'mock'
                    }
                    steps {
                        sh '''
                            # Start mock server in background
                            nohup npm run start-server > mock-server.log 2>&1 &
                            echo $! > mock-server.pid
                            
                            # Wait for mock server to start
                            timeout 30 bash -c 'until curl -f http://localhost:3000/health; do sleep 2; done'
                        '''
                    }
                }
            }
        }
        
        stage('Run Tests') {
            parallel {
                stage('Android Tests') {
                    when {
                        anyOf {
                            params.PLATFORM == 'android'
                            params.PLATFORM == 'both'
                        }
                    }
                    steps {
                        script {
                            try {
                                sh '''
                                    # Start Android emulator
                                    $ANDROID_HOME/emulator/emulator -avd test_emulator -no-audio -no-window &
                                    echo $! > emulator.pid
                                    
                                    # Wait for emulator to boot
                                    $ANDROID_HOME/platform-tools/adb wait-for-device
                                    timeout 300 bash -c 'until [[ "$($ANDROID_HOME/platform-tools/adb shell getprop sys.boot_completed)" == "1" ]]; do sleep 5; done'
                                    
                                    # Run Android tests
                                    export PLATFORM=android
                                    export API_BASE_URL=${ENVIRONMENT == 'mock' ? 'http://localhost:3000' : 'https://api.staging.example.com'}
                                    export APPIUM_HOST=localhost
                                    export APPIUM_PORT=4723
                                    export ENVIRONMENT=${ENVIRONMENT}
                                    
                                    npm test
                                '''
                            } catch (Exception e) {
                                currentBuild.result = 'UNSTABLE'
                                echo "Android tests failed: ${e.getMessage()}"
                            } finally {
                                // Clean up emulator
                                sh '''
                                    if [ -f emulator.pid ]; then
                                        kill $(cat emulator.pid) || true
                                        rm emulator.pid
                                    fi
                                '''
                            }
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'allure-results/**/*', fingerprint: true, allowEmptyArchive: true
                            archiveArtifacts artifacts: 'screenshots/**/*', fingerprint: true, allowEmptyArchive: true
                            archiveArtifacts artifacts: 'logs/**/*', fingerprint: true, allowEmptyArchive: true
                        }
                    }
                }
                
                stage('iOS Tests') {
                    when {
                        anyOf {
                            params.PLATFORM == 'ios'
                            params.PLATFORM == 'both'
                        }
                    }
                    steps {
                        script {
                            try {
                                sh '''
                                    # Start iOS simulator
                                    UDID=$(xcrun simctl create "TestDevice" "com.apple.CoreSimulator.SimDeviceType.iPhone-13" "com.apple.CoreSimulator.SimRuntime.iOS-16-4")
                                    xcrun simctl boot $UDID
                                    echo $UDID > simulator.udid
                                    
                                    # Run iOS tests
                                    export PLATFORM=ios
                                    export IOS_DEVICE_NAME="iPhone 13"
                                    export IOS_PLATFORM_VERSION="16.4"
                                    export UDID=$UDID
                                    export API_BASE_URL=${ENVIRONMENT == 'mock' ? 'http://localhost:3000' : 'https://api.staging.example.com'}
                                    export APPIUM_HOST=localhost
                                    export APPIUM_PORT=4723
                                    export ENVIRONMENT=${ENVIRONMENT}
                                    
                                    npm test
                                '''
                            } catch (Exception e) {
                                currentBuild.result = 'UNSTABLE'
                                echo "iOS tests failed: ${e.getMessage()}"
                            } finally {
                                // Clean up simulator
                                sh '''
                                    if [ -f simulator.udid ]; then
                                        xcrun simctl delete $(cat simulator.udid) || true
                                        rm simulator.udid
                                    fi
                                '''
                            }
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'allure-results/**/*', fingerprint: true, allowEmptyArchive: true
                            archiveArtifacts artifacts: 'screenshots/**/*', fingerprint: true, allowEmptyArchive: true
                            archiveArtifacts artifacts: 'logs/**/*', fingerprint: true, allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        stage('Generate Reports') {
            steps {
                script {
                    try {
                        sh '''
                            # Generate Allure report
                            npm run report || true
                        '''
                        
                        publishHTML([
                            allowMissing: false,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: 'allure-report',
                            reportFiles: 'index.html',
                            reportName: 'Allure Test Report'
                        ])
                        
                        // Publish test results
                        publishTestResults testResultsPattern: 'allure-results/*.json'
                        
                    } catch (Exception e) {
                        echo "Report generation failed: ${e.getMessage()}"
                    }
                }
            }
        }
        
        stage('Docker Build & Test') {
            when {
                branch 'main'
            }
            steps {
                script {
                    try {
                        sh '''
                            # Build Docker images
                            docker build -t fraud-detection-tests:${SHORT_COMMIT} .
                            docker build -f Dockerfile.mock-server -t fraud-mock-api:${SHORT_COMMIT} .
                            docker build -f Dockerfile.appium -t fraud-appium-server:${SHORT_COMMIT} .
                            
                            # Test Docker Compose
                            docker-compose -f docker-compose.yml config
                            
                            # Tag as latest
                            docker tag fraud-detection-tests:${SHORT_COMMIT} fraud-detection-tests:latest
                            docker tag fraud-mock-api:${SHORT_COMMIT} fraud-mock-api:latest
                            docker tag fraud-appium-server:${SHORT_COMMIT} fraud-appium-server:latest
                        '''
                    } catch (Exception e) {
                        echo "Docker build failed: ${e.getMessage()}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Clean up processes
                sh '''
                    # Kill Appium server
                    if [ -f appium.pid ]; then
                        kill $(cat appium.pid) || true
                        rm appium.pid
                    fi
                    
                    # Kill mock server
                    if [ -f mock-server.pid ]; then
                        kill $(cat mock-server.pid) || true
                        rm mock-server.pid
                    fi
                    
                    # Clean up Docker containers
                    docker-compose -f docker-compose.yml down || true
                '''
            }
            
            // Archive logs
            archiveArtifacts artifacts: '*.log', fingerprint: true, allowEmptyArchive: true
            
            // Clean workspace
            cleanWs()
        }
        
        success {
            script {
                if (env.SLACK_WEBHOOK_URL) {
                    slackSend(
                        channel: '#qa-automation',
                        color: 'good',
                        message: """
                        ✅ Fraud Detection Tests Passed!
                        
                        Platform: ${params.PLATFORM}
                        Environment: ${params.ENVIRONMENT}
                        Build: #${BUILD_NUMBER}
                        Commit: ${SHORT_COMMIT}
                        
                        View Report: ${BUILD_URL}allure/
                        """,
                        teamDomain: 'your-team',
                        token: env.SLACK_TOKEN
                    )
                }
            }
        }
        
        failure {
            script {
                if (env.SLACK_WEBHOOK_URL) {
                    slackSend(
                        channel: '#qa-automation',
                        color: 'danger',
                        message: """
                        ❌ Fraud Detection Tests Failed!
                        
                        Platform: ${params.PLATFORM}
                        Environment: ${params.ENVIRONMENT}
                        Build: #${BUILD_NUMBER}
                        Commit: ${SHORT_COMMIT}
                        
                        View Logs: ${BUILD_URL}console
                        """,
                        teamDomain: 'your-team',
                        token: env.SLACK_TOKEN
                    )
                }
            }
        }
        
        unstable {
            script {
                if (env.SLACK_WEBHOOK_URL) {
                    slackSend(
                        channel: '#qa-automation',
                        color: 'warning',
                        message: """
                        ⚠️ Fraud Detection Tests Unstable!
                        
                        Some tests may have failed, but the build completed.
                        
                        Platform: ${params.PLATFORM}
                        Environment: ${params.ENVIRONMENT}
                        Build: #${BUILD_NUMBER}
                        Commit: ${SHORT_COMMIT}
                        
                        View Report: ${BUILD_URL}allure/
                        """,
                        teamDomain: 'your-team',
                        token: env.SLACK_TOKEN
                    )
                }
            }
        }
    }
}