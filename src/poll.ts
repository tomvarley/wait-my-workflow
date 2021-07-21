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
	let deadline = now + timeoutSeconds * 1000;
	let first = true

	while (now <= deadline) {
		log('-----------------');
		log(
			`Retrieving check runs named ${checkName} on ${owner}/${repo}@${ref}...`
		);

		log(`${checkName} waiting`);
		await wait(intervalSeconds * 10000);
		if(first){
			log(`${checkName} waiting`);
			await wait(intervalSeconds * 1000);
			first = false;
		}

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
			log(`${checkName} job does not exist. Conclusion : 'not found'`);
			return 'not found';
		}

		const checkRun = check[0]

		if (checkRun.status === 'queued') {
			log(`Found a ${checkName} job in queue`);
			deadline = now + timeoutSeconds * 1000;
		}

		if (checkRun.status === 'in_progress') {
			log(`Found a ${checkName} job in progress`);
		}

		if (checkRun.status === 'completed') {
			log(
				`Found a completed check with id ${checkRun.id} and conclusion ${checkRun.conclusion}`
			);
			return checkRun.conclusion;
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
