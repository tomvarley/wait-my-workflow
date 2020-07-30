import {GitHub} from '@actions/github';
import {wait} from './wait';

export interface Options {
	client: GitHub;
	log: (message: string) => void;

	checkName: string;
	timeoutSeconds: number;
	intervalSeconds: number;
	owner: string;
	repo: string;
	ref: string;
}

export const poll = async (options: Options): Promise<string> => {
	const {
		client,
		log,
		checkName,
		timeoutSeconds,
		intervalSeconds,
		owner,
		repo,
		ref
	} = options;

	let now = new Date().getTime();
	const deadline = now + timeoutSeconds * 1000;

	while (now <= deadline) {
		log(
			`--------------------------\n
			Retrieving check runs named ${checkName} on ${owner}/${repo}@${ref}...`
		);
		const result = await client.checks.listForRef({
			// eslint-disable-next-line camelcase
			check_name: checkName,
			owner,
			repo,
			ref
		});

		log(
			`Retrieved ${result.data.check_runs.length} check runs named ${checkName}`
		);

		const check = result.data.check_runs;

		if (!check || !check.length) {
			log(`${checkName} job does not exist : stop wait`);
			return 'not found';
		} else {
			log(`${checkName} job find`);
		}

		if (check.find(checkRun => checkRun.status === 'queued')) {
			log(`${checkName} job is in queue`);
		}

		if (check.find(checkRun => checkRun.status === 'in_progress')) {
			log(`${checkName} job is in progress`);
		}

		if (check.find(checkRun => checkRun.status === 'completed')) {
			log(`${checkName} job is finish`);
			return 'success';
		}

		log(
			`No completed checks named ${checkName}, waiting for ${intervalSeconds} seconds...`
		);
		await wait(intervalSeconds * 1000);

		now = new Date().getTime();
	}

	log(
		`No completed checks after ${timeoutSeconds} seconds, exiting with conclusion 'timed_out'`
	);
	return 'timed_out';
};