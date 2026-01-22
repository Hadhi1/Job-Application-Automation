{
  "name": "Hadhi Job Matching + Resume + Interview + LinkedIn (Enhanced)",
  "nodes": [
    {
      "id": "manual",
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "position": [-1600, 0]
    },
    {
      "id": "prefs",
      "name": "Job Preferences",
      "type": "n8n-nodes-base.set",
      "position": [-1400, 0],
      "parameters": {
        "assignments": {
          "assignments": [
            { "name": "role", "value": "Backend Engineer", "type": "string" },
            { "name": "location", "value": "India", "type": "string" },
            { "name": "minScore", "value": 70, "type": "number" },
            { "name": "maxJobs", "value": 20, "type": "number" },
            { "name": "experienceLevel", "value": "Mid-Senior", "type": "string" },
            { "name": "preferredCompanies", "value": [], "type": "array" }
          ]
        }
      }
    },
    {
      "id": "resumeFile",
      "name": "Read Resume PDF",
      "type": "n8n-nodes-base.readBinaryFile",
      "position": [-1200, 0],
      "parameters": {
        "filePath": "/files/resume.pdf"
      },
      "continueOnFail": true
    },
    {
      "id": "resumeCheck",
      "name": "Check Resume Exists",
      "type": "n8n-nodes-base.if",
      "position": [-1000, 0],
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.data !== undefined }}",
              "operation": "equal",
              "value2": true
            }
          ]
        }
      }
    },
    {
      "id": "errorNotify",
      "name": "Send Error Notification",
      "type": "n8n-nodes-base.emailSend",
      "position": [-1000, 200],
      "parameters": {
        "fromEmail": "workflow@yourcompany.com",
        "toEmail": "user@email.com",
        "subject": "Resume File Not Found",
        "text": "The resume file could not be found at /files/resume.pdf"
      }
    },
    {
      "id": "extractResume",
      "name": "Extract Resume Text",
      "type": "n8n-nodes-base.extractFromFile",
      "position": [-800, 0],
      "parameters": {
        "operation": "pdf",
        "binaryPropertyName": "data"
      },
      "continueOnFail": true
    },
    {
      "id": "validateExtraction",
      "name": "Validate Text Extraction",
      "type": "n8n-nodes-base.if",
      "position": [-600, 0],
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.text }}",
              "operation": "isNotEmpty"
            }
          ]
        }
      }
    },
    {
      "id": "openai",
      "name": "ChatGPT",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAI",
      "position": [-400, 400],
      "credentials": {
        "openAiApi": { "name": "OpenAI Account" }
      },
      "parameters": {
        "model": "gpt-4o-mini",
        "temperature": 0.3,
        "maxTokens": 2000,
        "timeout": 60000
      }
    },
    {
      "id": "resumeIntel",
      "name": "Resume Intelligence",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "position": [-400, 0],
      "parameters": {
        "promptType": "define",
        "text": "Analyze this resume and extract structured information. Return JSON with:\n{\n  \"skills\": [\"skill1\", \"skill2\"],\n  \"experience_years\": number,\n  \"current_role\": \"string\",\n  \"previous_roles\": [\"role1\", \"role2\"],\n  \"education\": [\"degree1\", \"degree2\"],\n  \"certifications\": [\"cert1\", \"cert2\"],\n  \"key_achievements\": [\"achievement1\"],\n  \"technical_stack\": [\"tech1\", \"tech2\"]\n}\n\nResume Text:\n{{ $json.text }}"
      },
      "continueOnFail": true
    },
    {
      "id": "parseResumeJSON",
      "name": "Parse Resume JSON",
      "type": "n8n-nodes-base.code",
      "position": [-200, 0],
      "parameters": {
        "jsCode": "const output = $input.item.json.output || '{}';\ntry {\n  const parsed = JSON.parse(output);\n  return { json: { resumeData: parsed, rawText: $input.item.json.text } };\n} catch (e) {\n  return { json: { resumeData: {}, rawText: $input.item.json.text, error: e.message } };\n}"
      }
    },
    {
      "id": "jobFetch",
      "name": "Fetch Jobs (Apify)",
      "type": "n8n-nodes-base.httpRequest",
      "position": [0, 0],
      "parameters": {
        "method": "POST",
        "url": "https://api.apify.com/v2/acts/muhammetakkurtt~naukri-job-scraper/run-sync-get-dataset-items",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            { "name": "token", "value": "={{ $credentials.apifyApi.token }}" }
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "body": "={\n  \"title\": \"{{ $('Job Preferences').item.json.role }}\",\n  \"location\": \"{{ $('Job Preferences').item.json.location }}\",\n  \"maxJobs\": {{ $('Job Preferences').item.json.maxJobs }}\n}",
        "options": {
          "timeout": 120000,
          "redirect": {
            "redirect": {
              "maxRedirects": 5
            }
          }
        }
      },
      "credentials": {
        "apifyApi": { "name": "Apify Account" }
      },
      "continueOnFail": true
    },
    {
      "id": "validateJobs",
      "name": "Validate Jobs Retrieved",
      "type": "n8n-nodes-base.if",
      "position": [200, 0],
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{ $json.length || 0 }}",
              "operation": "larger",
              "value2": 0
            }
          ]
        }
      }
    },
    {
      "id": "deduplicateJobs",
      "name": "Deduplicate Jobs",
      "type": "n8n-nodes-base.removeDuplicates",
      "position": [400, 0],
      "parameters": {
        "compare": "selectedFields",
        "fieldsToCompare": {
          "fields": [
            { "fieldName": "jobId" },
            { "fieldName": "title" },
            { "fieldName": "companyName" }
          ]
        }
      }
    },
    {
      "id": "loop",
      "name": "Loop Jobs",
      "type": "n8n-nodes-base.splitInBatches",
      "position": [600, 0],
      "parameters": {
        "batchSize": 1,
        "options": {
          "reset": false
        }
      }
    },
    {
      "id": "enrichJob",
      "name": "Enrich Job Data",
      "type": "n8n-nodes-base.code",
      "position": [800, 0],
      "parameters": {
        "jsCode": "const job = $input.item.json;\nconst resumeData = $('Parse Resume JSON').item.json.resumeData;\n\nreturn {\n  json: {\n    ...job,\n    jobSkills: job.skills || [],\n    resumeSkills: resumeData.skills || [],\n    timestamp: new Date().toISOString()\n  }\n};"
      }
    },
    {
      "id": "matchScore",
      "name": "Match Scoring",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "position": [1000, 0],
      "parameters": {
        "promptType": "define",
        "text": "Analyze job-resume match and return ONLY valid JSON (no markdown, no code blocks):\n{\n  \"match_score\": number (0-100),\n  \"matched_skills\": [\"skill1\", \"skill2\"],\n  \"missing_skills\": [\"skill1\", \"skill2\"],\n  \"experience_match\": \"Excellent|Good|Fair|Poor\",\n  \"salary_alignment\": \"string\",\n  \"strengths\": [\"strength1\"],\n  \"gaps\": [\"gap1\"],\n  \"recommendation\": \"Apply|Consider|Skip\"\n}\n\nResume:\n{{ JSON.stringify($('Parse Resume JSON').item.json.resumeData) }}\n\nJob:\nTitle: {{ $json.title }}\nCompany: {{ $json.companyName }}\nDescription: {{ $json.jobDescription }}\nRequired Skills: {{ $json.jobSkills }}"
      },
      "continueOnFail": true
    },
    {
      "id": "parseMatchJSON",
      "name": "Parse Match Score JSON",
      "type": "n8n-nodes-base.code",
      "position": [1200, 0],
      "parameters": {
        "jsCode": "let output = $input.item.json.output || '{}';\n\n// Remove markdown code blocks if present\noutput = output.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();\n\ntry {\n  const parsed = JSON.parse(output);\n  return {\n    json: {\n      ...$input.item.json,\n      ...parsed,\n      match_score: parsed.match_score || 0\n    }\n  };\n} catch (e) {\n  // Fallback: extract score with regex\n  const scoreMatch = output.match(/\"match_score\"\\s*:\\s*(\\d+)/);\n  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;\n  \n  return {\n    json: {\n      ...$input.item.json,\n      match_score: score,\n      matched_skills: [],\n      missing_skills: [],\n      parseError: e.message\n    }\n  };\n}"
      }
    },
    {
      "id": "gate",
      "name": "Score >= Threshold",
      "type": "n8n-nodes-base.if",
      "position": [1400, 0],
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{ $json.match_score }}",
              "operation": "largerEqual",
              "value2": "={{ $('Job Preferences').item.json.minScore }}"
            }
          ]
        }
      }
    },
    {
      "id": "logRejected",
      "name": "Log Rejected Jobs",
      "type": "n8n-nodes-base.googleSheets",
      "position": [1400, 200],
      "credentials": {
        "googleSheetsOAuth2Api": { "name": "Google Sheets Account" }
      },
      "parameters": {
        "operation": "append",
        "documentId": "YOUR_MASTER_SHEET_ID",
        "sheetName": "Rejected_Jobs",
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "Job Title": "={{ $json.title }}",
            "Company": "={{ $json.companyName }}",
            "Match Score": "={{ $json.match_score }}",
            "Reason": "Below threshold",
            "Date": "={{ $now.format('yyyy-MM-dd HH:mm:ss') }}"
          }
        }
      }
    },
    {
      "id": "resumeGen",
      "name": "Generate Tailored Resume",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "position": [1600, 0],
      "parameters": {
        "promptType": "define",
        "text": "Create an ATS-optimized resume tailored for this specific job. Include:\n- Relevant skills from: {{ $json.matched_skills }}\n- Quantifiable achievements\n- Keywords from job description\n- Proper formatting\n\nOriginal Resume Data:\n{{ JSON.stringify($('Parse Resume JSON').item.json.resumeData) }}\n\nTarget Job:\nTitle: {{ $json.title }}\nCompany: {{ $json.companyName }}\nDescription: {{ $json.jobDescription }}\nRequired Skills: {{ $json.jobSkills }}\n\nReturn formatted resume text (300-400 words)."
      }
    },
    {
      "id": "coverLetterGen",
      "name": "Generate Cover Letter",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "position": [1800, 0],
      "parameters": {
        "promptType": "define",
        "text": "Write a compelling cover letter (200-250 words) for:\n\nJob: {{ $json.title }} at {{ $json.companyName }}\nCandidate Strengths: {{ $json.strengths }}\nMatched Skills: {{ $json.matched_skills }}\n\nInclude:\n- Why interested in this role\n- Relevant experience highlights\n- Value proposition\n- Call to action"
      }
    },
    {
      "id": "questionsGen",
      "name": "Generate Interview Questions",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "position": [2000, 0],
      "parameters": {
        "promptType": "define",
        "text": "Generate comprehensive interview preparation for:\n\nRole: {{ $json.title }}\nCompany: {{ $json.companyName }}\nRequired Skills: {{ $json.jobSkills }}\nCandidate Gaps: {{ $json.gaps }}\n\nProvide JSON:\n{\n  \"technical_questions\": [\"q1\", \"q2\", \"q3\"],\n  \"behavioral_questions\": [\"q1\", \"q2\", \"q3\"],\n  \"company_specific\": [\"q1\", \"q2\"],\n  \"questions_to_ask\": [\"q1\", \"q2\", \"q3\"],\n  \"gap_preparation\": [\"tip1\", \"tip2\"]\n}"
      }
    },
    {
      "id": "linkedinFetch",
      "name": "Fetch LinkedIn Employees",
      "type": "n8n-nodes-base.httpRequest",
      "position": [2200, 0],
      "parameters": {
        "method": "POST",
        "url": "https://api.apify.com/v2/acts/apify~linkedin-company-employees/run-sync-get-dataset-items",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            { "name": "token", "value": "={{ $credentials.apifyApi.token }}" }
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "body": "={\n  \"companyName\": \"{{ $json.companyName }}\",\n  \"maxItems\": 10,\n  \"filters\": {\n    \"currentCompanyOnly\": true\n  }\n}",
        "options": {
          "timeout": 90000
        }
      },
      "credentials": {
        "apifyApi": { "name": "Apify Account" }
      },
      "continueOnFail": true
    },
    {
      "id": "identifyContacts",
      "name": "Identify Key Contacts",
      "type": "n8n-nodes-base.code",
      "position": [2400, 0],
      "parameters": {
        "jsCode": "const employees = $input.item.json || [];\nconst targetRoles = ['recruiter', 'talent', 'hiring', 'hr', 'manager', 'director', 'head'];\n\nconst priorityContacts = employees.filter(emp => {\n  const title = (emp.title || '').toLowerCase();\n  return targetRoles.some(role => title.includes(role));\n}).slice(0, 5);\n\nreturn {\n  json: {\n    ...$input.item.json,\n    priorityContacts: priorityContacts.map(c => ({\n      name: c.name,\n      title: c.title,\n      profileUrl: c.profileUrl\n    })),\n    totalEmployees: employees.length\n  }\n};"
      }
    },
    {
      "id": "companyResearch",
      "name": "Company Research Summary",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "position": [2600, 0],
      "parameters": {
        "promptType": "define",
        "text": "Research {{ $json.companyName }} and provide:\n{\n  \"company_overview\": \"brief description\",\n  \"recent_news\": [\"news1\", \"news2\"],\n  \"culture_insights\": [\"insight1\", \"insight2\"],\n  \"interview_tips\": [\"tip1\", \"tip2\"]\n}\n\nUse web search if needed."
      }
    },
    {
      "id": "aggregateData",
      "name": "Aggregate Application Data",
      "type": "n8n-nodes-base.code",
      "position": [2800, 0],
      "parameters": {
        "jsCode": "const jobData = $input.item.json;\nconst resume = $('Generate Tailored Resume').item.json.output;\nconst coverLetter = $('Generate Cover Letter').item.json.output;\nconst questions = $('Generate Interview Questions').item.json.output;\nconst company = $('Company Research Summary').item.json.output;\n\n// Parse questions if JSON\nlet parsedQuestions = {};\ntry {\n  const cleanQ = questions.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();\n  parsedQuestions = JSON.parse(cleanQ);\n} catch (e) {\n  parsedQuestions = { raw: questions };\n}\n\n// Parse company research\nlet parsedCompany = {};\ntry {\n  const cleanC = company.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();\n  parsedCompany = JSON.parse(cleanC);\n} catch (e) {\n  parsedCompany = { raw: company };\n}\n\nreturn {\n  json: {\n    jobTitle: jobData.title,\n    companyName: jobData.companyName,\n    matchScore: jobData.match_score,\n    matchedSkills: jobData.matched_skills,\n    missingSkills: jobData.missing_skills,\n    applicationStatus: 'Generated',\n    tailoredResume: resume,\n    coverLetter: coverLetter,\n    interviewQuestions: parsedQuestions,\n    companyResearch: parsedCompany,\n    priorityContacts: jobData.priorityContacts || [],\n    jobUrl: jobData.jobUrl,\n    appliedDate: null,\n    followUpDate: null,\n    notes: '',\n    createdAt: new Date().toISOString()\n  }\n};"
      }
    },
    {
      "id": "masterSheet",
      "name": "Write to Master Tracker",
      "type": "n8n-nodes-base.googleSheets",
      "position": [3000, 0],
      "credentials": {
        "googleSheetsOAuth2Api": { "name": "Google Sheets Account" }
      },
      "parameters": {
        "operation": "append",
        "documentId": "YOUR_MASTER_SHEET_ID",
        "sheetName": "Job_Applications",
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "Timestamp": "={{ $json.createdAt }}",
            "Job Title": "={{ $json.jobTitle }}",
            "Company": "={{ $json.companyName }}",
            "Match Score": "={{ $json.matchScore }}",
            "Matched Skills": "={{ $json.matchedSkills.join(', ') }}",
            "Missing Skills": "={{ $json.missingSkills.join(', ') }}",
            "Status": "={{ $json.applicationStatus }}",
            "Job URL": "={{ $json.jobUrl }}",
            "Priority Contacts": "={{ $json.priorityContacts.length }}",
            "Applied Date": "",
            "Follow Up Date": "",
            "Notes": ""
          }
        }
      }
    },
    {
      "id": "createDocuments",
      "name": "Create Google Docs",
      "type": "n8n-nodes-base.googleDocs",
      "position": [3200, 0],
      "credentials": {
        "googleDocsOAuth2Api": { "name": "Google Docs Account" }
      },
      "parameters": {
        "operation": "create",
        "title": "={{ $json.companyName }} - {{ $json.jobTitle }} - Application Pack",
        "folderId": "YOUR_FOLDER_ID",
        "content": "=# Application for {{ $json.jobTitle }} at {{ $json.companyName }}\n\n## Match Score: {{ $json.matchScore }}/100\n\n## Tailored Resume\n{{ $json.tailoredResume }}\n\n## Cover Letter\n{{ $json.coverLetter }}\n\n## Interview Preparation\n{{ JSON.stringify($json.interviewQuestions, null, 2) }}\n\n## Company Research\n{{ JSON.stringify($json.companyResearch, null, 2) }}\n\n## Key Contacts\n{{ JSON.stringify($json.priorityContacts, null, 2) }}"
      }
    },
    {
      "id": "sendNotification",
      "name": "Send Success Notification",
      "type": "n8n-nodes-base.emailSend",
      "position": [3400, 0],
      "parameters": {
        "fromEmail": "workflow@yourcompany.com",
        "toEmail": "user@email.com",
        "subject": "=New Job Match: {{ $json.jobTitle }} at {{ $json.companyName }} ({{ $json.matchScore }}% match)",
        "text": "=A new job matching your criteria has been processed:\n\nJob: {{ $json.jobTitle }}\nCompany: {{ $json.companyName }}\nMatch Score: {{ $json.matchScore }}%\n\nMatched Skills: {{ $json.matchedSkills.join(', ') }}\n\nDocuments created and ready for review.\n\nJob URL: {{ $json.jobUrl }}"
      }
    },
    {
      "id": "loopComplete",
      "name": "Check Loop Complete",
      "type": "n8n-nodes-base.if",
      "position": [3600, 0],
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $('Batch Process Jobs').isLastBatch }}",
              "operation": "equal",
              "value2": true
            }
          ]
        }
      }
    },
    {
      "id": "summaryReport",
      "name": "Generate Summary Report",
      "type": "n8n-nodes-base.code",
      "position": [3800, 0],
      "parameters": {
        "jsCode": "const allJobs = $('Write to Master Tracker').all();\n\nconst summary = {\n  totalJobsProcessed: allJobs.length,\n  averageMatchScore: allJobs.reduce((sum, j) => sum + (j.json.matchScore || 0), 0) / allJobs.length,\n  topMatches: allJobs.filter(j => j.json.matchScore >= 80).length,\n  companiesList: [...new Set(allJobs.map(j => j.json.companyName))],\n  timestamp: new Date().toISOString()\n};\n\nreturn { json: summary };"
      }
    },
    {
      "id": "finalNotification",
      "name": "Send Final Summary",
      "type": "n8n-nodes-base.emailSend",
      "position": [4000, 0],
      "parameters": {
        "fromEmail": "workflow@yourcompany.com",
        "toEmail": "user@email.com",
        "subject": "=Job Search Complete - {{ $json.totalJobsProcessed }} Applications Processed",
        "text": "=Job search workflow completed!\n\nTotal Jobs Processed: {{ $json.totalJobsProcessed }}\nAverage Match Score: {{ $json.averageMatchScore.toFixed(1) }}%\nTop Matches (80%+): {{ $json.topMatches }}\n\nCompanies: {{ $json.companiesList.join(', ') }}\n\nCheck your Master Tracker for details."
      }
    }
  ],

  "connections": {
    "Manual Trigger": { "main": [[{ "node": "Job Preferences" }]] },
    "Job Preferences": { "main": [[{ "node": "Read Resume PDF" }]] },
    "Read Resume PDF": { "main": [[{ "node": "Check Resume Exists" }]] },
    "Check Resume Exists": {
      "main": [
        [{ "node": "Extract Resume Text" }],
        [{ "node": "Send Error Notification" }]
      ]
    },
    "Extract Resume Text": { "main": [[{ "node": "Validate Text Extraction" }]] },
    "Validate Text Extraction": {
      "main": [
        [{ "node": "Resume Intelligence" }],
        []
      ]
    },
    "ChatGPT": {
      "ai_languageModel": [
        [{ "node": "Resume Intelligence" }],
        [{ "node": "Match Scoring" }],
        [{ "node": "Generate Tailored Resume" }],
        [{ "node": "Generate Cover Letter" }],
        [{ "node": "Generate Interview Questions" }],
        [{ "node": "Company Research Summary" }]
      ]
    },
    "Resume Intelligence": { "main": [[{ "node": "Parse Resume JSON" }]] },
    "Parse Resume JSON": { "main": [[{ "node": "Fetch Jobs (Apify)" }]] },
    "Fetch Jobs (Apify)": { "main": [[{ "node": "Validate Jobs Retrieved" }]] },
    "Validate Jobs Retrieved": {
      "main": [
        [{ "node": "Deduplicate Jobs" }],
        []
      ]
    },
    "Deduplicate Jobs": { "main": [[{ "node": "Loop Jobs" }]] },
    "Loop Jobs": { "main": [[{ "node": "Enrich Job Data" }]] },
    "Enrich Job Data": { "main": [[{ "node": "Match Scoring" }]] },
    "Match Scoring": { "main": [[{ "node": "Parse Match Score JSON" }]] },
    "Parse Match Score JSON": { "main": [[{ "node": "Score >= Threshold" }]] },
    "Score >= Threshold": {
      "main": [
        [{ "node": "Generate Tailored Resume" }],
        [{ "node": "Log Rejected Jobs" }]
      ]
    },
    "Generate Tailored Resume": { "main": [[{ "node": "Generate Cover Letter" }]] },
    "Generate Cover Letter": { "main": [[{ "node": "Generate Interview Questions" }]] },
    "Generate Interview Questions": { "main": [[{ "node": "Fetch LinkedIn Employees" }]] },
    "Fetch LinkedIn Employees": { "main": [[{ "node": "Identify Key Contacts" }]] },
    "Identify Key Contacts": { "main": [[{ "node": "Company Research Summary" }]] },
    "Company Research Summary": { "main": [[{ "node": "Aggregate Application Data" }]] },
    "Aggregate Application Data": { "main": [[{ "node": "Write to Master Tracker" }]] },
    "Write to Master Tracker": { "main": [[{ "node": "Create Google Docs" }]] },
    "Create Google Docs": { "main": [[{ "node": "Send Success Notification" }]] },
    "Send Success Notification": { "main": [[{ "node": "Check Loop Complete" }]] },
    "Check Loop Complete": {
      "main": [
        [{ "node": "Generate Summary Report" }],
        []
      ]
    },
    "Generate Summary Report": { "main": [[{ "node": "Send Final Summary" }]] }
  },

  "active": false,
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "callerPolicy": "workflowsFromSameOwner",
    "errorWorkflow": "YOUR_ERROR_HANDLER_WORKFLOW_ID"
  }
}