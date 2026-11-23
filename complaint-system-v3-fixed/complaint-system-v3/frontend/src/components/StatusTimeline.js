import React from 'react';

/**
 * StatusTimeline — Modern multi-step progress timeline for grievances
 *
 * Props:
 *   status: current status string
 *   moduleType: 'department' | 'transportation'
 *   isEscalated: boolean
 */
export default function StatusTimeline({ status, moduleType = 'department', isEscalated = false }) {
  const deptSteps = ['Pending', 'In Progress', 'Resolved'];
  const busSteps  = ['Received', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];

  const steps = moduleType === 'transportation' ? busSteps : deptSteps;
  const currentIndex = steps.indexOf(status);

  return (
    <div className="status-timeline">
      {steps.map((step, index) => {
        const isCompleted = currentIndex > index;
        const isActive = currentIndex === index;
        const stepClass = isEscalated && isActive
          ? 'escalated'
          : isCompleted
            ? 'completed'
            : isActive
              ? 'active'
              : '';

        return (
          <div key={step} className={`timeline-step ${stepClass}`}>
            <div className="timeline-circle">
              {isCompleted ? '✓' : index + 1}
            </div>
            <div className="timeline-label">
              {step}
              {isEscalated && isActive && ' (Escalated)'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
