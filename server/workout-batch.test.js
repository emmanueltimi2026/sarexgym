import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWorkoutBatchEligibility, uniqueWorkoutMemberIds } from './routes.js';

test('workout batch selection removes duplicate member ids',()=>{
 const ids=uniqueWorkoutMemberIds({memberIds:['member-a','member-b','member-a']});
 assert.deepEqual(ids,['member-a','member-b']);
});

test('workout batch eligibility rejects the complete operation when any member is ineligible',()=>{
 assert.throws(()=>assertWorkoutBatchEligibility([{member_id:'member-a'}],['member-a','member-b']),error=>error.code==='WORKOUT_ACCESS_REQUIRED'&&error.status===403);
 assert.doesNotThrow(()=>assertWorkoutBatchEligibility([{member_id:'member-a'},{member_id:'member-b'}],['member-a','member-b']));
});
