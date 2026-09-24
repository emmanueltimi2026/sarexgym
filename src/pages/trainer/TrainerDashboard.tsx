import { memberGoalLabel } from '../../../shared/fitness-goals.js';
import React from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import {
  Users,
  Dumbbell,
  Plus,
  ArrowRight,
  Target
} from 'lucide-react';

export const TrainerDashboard: React.FC = () => {
  const { members, workoutPlans, user, navigate } = useGym();

  const assignedMembers = members.filter(m => m.assignedTrainerId === user?.id);
  const myPlans = workoutPlans.filter(p => p.trainerId === user?.id);

  return (
    <AppLayout
      pageTitle="Trainer Performance Hub"
      pageSubtitle="See assigned members, upcoming sessions, and current training responsibilities."
      breadcrumbs={[{ label: 'Trainer Portal' }, { label: 'Dashboard' }]}
      actions={
        <button
          onClick={() => navigate('/trainer/plans')}
          className="px-4 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create Program
        </button>
      }
    >
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <StatCard
          label="Assigned Members"
          value={assignedMembers.length}
          subtext="Under active training"
          icon={Users}
        />
        <StatCard
          label="Active Workout Programs"
          value={myPlans.length}
          subtext="Assigned member programs"
          icon={Dumbbell}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-athletic font-bold uppercase tracking-wider text-base text-[#111111]">
                My Assigned Members
              </h3>
              <p className="text-xs text-gray-500">Members assigned to your training roster</p>
            </div>
            <button
              onClick={() => navigate('/trainer/members')}
              className="text-xs font-bold text-[#EF1B23] hover:underline flex items-center gap-1"
            >
              All Members <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {(assignedMembers || []).slice(0, 5).map(member => (
              <div
                key={member.id}
                className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded transition-colors"
              >
                <div className="flex items-center gap-3">
                  <InitialsAvatar src={member.photo} firstName={member.firstName} lastName={member.lastName} className="h-10 w-10 text-xs" />
                  <div>
                    <span className="font-bold text-[#111111] block">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Target className="w-3 h-3 text-[#EF1B23]" />
                      {memberGoalLabel(member.fitnessGoal)}
                    </span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <Badge
                    variant={
                      member.membershipStatus === 'Active'
                        ? 'success'
                        : member.membershipStatus === 'Expiring'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {member.membershipStatus}
                  </Badge>
                  <button
                    onClick={() => navigate('/trainer/members')}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-[#EF1B23] hover:text-white text-gray-700 font-athletic font-bold uppercase text-[11px] rounded transition-colors"
                  >
                    Profile
                  </button>
                </div>
              </div>
            ))}
            {(!assignedMembers || assignedMembers.length === 0) && (
              <div className="py-6 text-center text-gray-400 text-xs">
                No members currently assigned.
              </div>
            )}
          </div>
        </div>

        
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-athletic font-bold uppercase tracking-wider text-base text-[#111111]">
                Training Programs
              </h3>
              <button
                onClick={() => navigate('/trainer/plans')}
                className="text-xs font-bold text-[#EF1B23] hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {(myPlans || []).map(plan => {
                const title = plan.title || plan.workoutName || 'Training Program';
                const difficulty = plan.difficulty || 'Intermediate';
                const routineCount = plan.routine?.length ?? (plan.exercises?.length ? 1 : 0);
                const daysPerWeek = plan.daysPerWeek || (routineCount > 0 ? routineCount : 3);

                return (
                  <div
                    key={plan.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-athletic font-bold uppercase text-sm text-[#111111]">
                        {title}
                      </span>
                      <span className="text-[10px] font-bold bg-neutral-800 text-white px-2 py-0.5 rounded">
                        {difficulty}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                      {plan.description}
                    </p>

                    <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
                      <span>{daysPerWeek} Days/Week</span>
                      <span>{routineCount} Routine Splits</span>
                    </div>
                  </div>
                );
              })}
              {(!myPlans || myPlans.length === 0) && (
                <div className="py-6 text-center text-gray-400 text-xs">
                  No programs created yet. Click "Create Program" to design one.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
