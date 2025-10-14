function listDueAssignments() {
  try {
    const courses = Classroom.Courses.list({
      studentId: 'me',
      courseStates: ['ACTIVE']
    }).courses;

    const allAssignments = [];
    courses.forEach(course => {
      try {
        const coursework = Classroom.Courses.CourseWork.list(course.id).courseWork;

        if (coursework) {
          coursework.forEach(assignment => {
            if (assignment.dueDate) {
              const dueDate = new Date(
                assignment.dueDate.year,
                assignment.dueDate.month - 1, // Month is 0-indexed in JavaScript
                assignment.dueDate.day
              );

              if (assignment.dueTime) {
                dueDate.setHours(assignment.dueTime.hours || 23);
                dueDate.setMinutes(assignment.dueTime.minutes || 59);
              }

              // Get submission status
              let submissionState = 'UNKNOWN';
              try {
                const submissions = Classroom.Courses.CourseWork.StudentSubmissions.list(
                  course.id,
                  assignment.id,
                  { userId: 'me' }
                ).studentSubmissions;

                if (submissions && submissions.length > 0) {
                  submissionState = submissions[0].state;
                }
              } catch (submissionError) {
                Logger.log(`Error fetching submission for ${assignment.title}: ${submissionError.message}`);
              }

              allAssignments.push({
                courseName: course.name,
                title: assignment.title,
                description: assignment.description || 'No description',
                dueDate: dueDate,
                state: assignment.state,
                submissionState: submissionState,
                turnedIn: submissionState === 'TURNED_IN' || submissionState === 'RETURNED',
                alternateLink: assignment.alternateLink,
                id: assignment.id,
                materials: assignment.materials
              });
            }
          });
        }
      } catch (error) {
        Logger.log(`Error fetching coursework for ${course.name}: ${error.message}`);
      }
    });

    allAssignments.sort((a, b) => a.dueDate - b.dueDate);

    if (allAssignments.length === 0) {
      Logger.log('No assignments due (somehow?), we probably goofed up somewhere');
      return;
    }

    console.log(JSON.stringify(allAssignments))
    UrlFetchApp.fetch("<api_endpoint>/data", {
      method: "post",
      payload: JSON.stringify(allAssignments),
      headers: {
        "Authorization": "Bearer <api_key>",
        "Content-Type": "application/json"
      }
    })
  } catch (error) {
    Logger.log(`Error: ${error.message}`);
  }
}

function setupFrequentTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'listDueAssignments') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('listDueAssignments')
    .timeBased()
    .everyMinutes(30)
    .create();

  Logger.log('30-minute trigger set up successfully');
}