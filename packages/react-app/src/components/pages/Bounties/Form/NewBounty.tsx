import { Controller, useForm } from 'react-hook-form';
import React, { useContext } from 'react';
import { useRouter } from 'next/router';
import DatePicker from '@app/components/parts/DatePicker';
import {
	Box,
	FormLabel,
	FormControl,
	Input,
	Text,
	Button,
	FormErrorMessage,
	Select,
	Flex,
	FormControlProps,
	Textarea,
	Alert,
	AlertIcon,
} from '@chakra-ui/react';
import { BountyCollection } from '@app/models/Bounty';
import bountyStatus from '@app/constants/bountyStatus';
import { CustomerContext } from '@app/context/CustomerContext';
import { APIUser } from 'discord-api-types';
import { useUser } from '@app/hooks/useUser';
import { useLocalStorage } from '@app/hooks/useLocalStorage';
import { dateIsNotInPast, required, validNonNegativeDecimal } from '@app/utils/formUtils';
import { WARNINGS } from '@app/errors';
import activity, { CLIENT } from '@app/constants/activity';

const PLACEHOLDERS = {
	TITLE: 'Example: Create new Logo',
	DESCRIPTION: 'Example: We need someone to create some snappy looking logos for our new Web3 project.',
	CRITERIA: 'Example: SVG and PNG images approved by the team',
};

const useCurrencies = (): string[] => {
	return ['BANK'];
};

const defaultValues = {
	title: '',
	description: '',
	reward: '1000',
	currency: 'BANK',
	criteria: '',
	dueAt: new Date().toISOString(),
	gatedTo: '',
	multiClaim: false,
	evergreen: false,
};

const NotNeededFields = [
	'_id',
	'claimedBy',
	'submissionNotes',
	'submissionUrl',
	'season',
	'claimedAt',
	'submittedAt',
	'reviewedAt',
	'reviewedBy',
	'submittedBy',
] as const;

const useCachedForm = () => {
	const { data: cachedBounty } = useLocalStorage<typeof defaultValues>('cachedEdit');
	return cachedBounty ?? defaultValues;
};

const generatePreviewData = (
	data: typeof defaultValues,
	customerId: string,
	user: APIUser
): Omit<BountyCollection, typeof NotNeededFields[number]> => {
	/**
   * Transform form data to match shape of bounty collection, then
   * cache to local storage so it can be picked up by the preview page
   */
	const amount = Number(data.reward);
	const decimalSplit = data.reward.split('.');
	const hasDecimals = decimalSplit.length > 1;
	const amountWithoutScale = hasDecimals ? Number(decimalSplit.join('')) : amount;
	const scale = hasDecimals ? decimalSplit[1].length : 0;
	return {
		title: data.title,
		description: data.description,
		criteria: data.criteria,
		customerId,
		status: bountyStatus.DRAFT,
		dueAt: new Date(data.dueAt).toISOString(),
		reward: {
			amount,
			currency: data.currency.toUpperCase(),
			amountWithoutScale,
			scale,
		},
		statusHistory: [
			{
				status: bountyStatus.DRAFT,
				modifiedAt: new Date().toISOString(),
			},
		],
		activityHistory: [
			{
				activity: activity.CREATE,
				modifiedAt: new Date().toISOString(),
				client: CLIENT.BOUNTYBOARD,
			},
		],
		discordMessageId: '',
		createdAt: new Date().toISOString(),
		createdBy: {
			discordHandle: `${user.username}#${user.discriminator}`,
			discordId: user.id,
		},
	};
};

const NewBountyForm = (): JSX.Element => {
	const router = useRouter();
	const { user, error } = useUser();
	const cachedBounty = useCachedForm();
	const currencies = useCurrencies();
	const { customer: { customerId } } = useContext(CustomerContext);
	const formControlProps: FormControlProps = { mt: '5' };
	const {
		register,
		handleSubmit,
		control,
		formState: {
			errors,
		},
	} = useForm({
		defaultValues: cachedBounty,
	});
	if (error) {
		console.warn('Could not fetch the user data from discord - this will cause issues trying to create bounties');
	}
	return (
		<form onSubmit={handleSubmit(data => {
			const preview = user && generatePreviewData(data, customerId, user);
			localStorage.setItem('cachedEdit', JSON.stringify(data));
			localStorage.setItem('previewBounty', JSON.stringify(preview));
			router.push('/preview-bounty');
		})}>
			<FormControl
				isInvalid={!!errors.title}
				{...formControlProps}
			>
				<FormLabel htmlFor='title'>Bounty Title</FormLabel>
				<Box
					bg="rgba(0,0,0,0.2)"
					p="4"
					my="2"
				>Give the bounty a catchy title</Box>
				<Input
					id='title'
					placeholder={PLACEHOLDERS.TITLE}
					{...register('title', { required }) }
				/>
				<FormErrorMessage>{errors.title?.message}</FormErrorMessage>
			</FormControl>

			<FormControl
				isInvalid={!!errors.description}
				{...formControlProps}
			>
				<FormLabel htmlFor='description'>Description</FormLabel>
				<Box
					bg="rgba(0,0,0,0.2)"
					p="4"
					my="2"
				>Provide a brief description of the bounty</Box>
				<Textarea
					id='description'
					placeholder={PLACEHOLDERS.DESCRIPTION}
					{...register('description', { required }) }/>
				<FormErrorMessage>{errors.description?.message}</FormErrorMessage>
			</FormControl>

			<FormControl
				isInvalid={!!errors.criteria}
				{...formControlProps}
			>
				<FormLabel htmlFor='criteria'>Criteria</FormLabel>
				<Box
					bg="rgba(0,0,0,0.2)"
					p="4"
					my="2"
				>What is absolutely required before the bounty will be considered complete?</Box>
				<Textarea
					id='criteria'
					placeholder={PLACEHOLDERS.CRITERIA}
					{...register('criteria', { required }) }
				/>
				<FormErrorMessage>{errors.criteria?.message}</FormErrorMessage>
			</FormControl>

			<FormControl
				isInvalid={!!errors.dueAt}
				{...formControlProps}
			>
				<FormLabel htmlFor="dueAt"
					mr="0"
				>
    Due At
				</FormLabel>
				<Controller
					name="dueAt"
					control={control}
					rules={{
						required,
						validate: v => dateIsNotInPast(v),
					}}
					render={({ field }) =>
						<DatePicker
							selected={new Date(field.value)}
							onChange={d => field.onChange(d)}
							id="published-date"
							showPopperArrow={true}
						/>
					}
				/>
				<FormErrorMessage>{errors.dueAt?.message}</FormErrorMessage>
			</FormControl>

			<Flex>
				<FormControl
					{...formControlProps}
					isInvalid={!!errors.reward}
					mr="1"
				>
					<FormLabel htmlFor='reward'>Reward</FormLabel>
					<Input id='reward' {...register('reward', {
						required, validate: (v: string) => validNonNegativeDecimal(v),
					})} />
					<FormErrorMessage>{errors.reward?.message}</FormErrorMessage>
				</FormControl>

				<FormControl
					{...formControlProps}
					isInvalid={!!errors.currency}
				>
					<FormLabel htmlFor='currency'>Currency</FormLabel>
					<Select id='currency' {...register('currency', { required })}>
						{currencies.map(c => <option key={c}>{c.toUpperCase()}</option>)}
					</Select>
					<FormErrorMessage>{errors.currency?.message}</FormErrorMessage>
				</FormControl>
			</Flex>
			<Button
				my="5"
				w="full"
				type="submit"
				disabled={!user}
			>
    	Preview
			</Button>
			{
				!user && <Alert status='warning'>
					<AlertIcon />
					<Text maxW="500px">{WARNINGS.ADBLOCKER}</Text>
				</Alert>
			}
		</form>
	);
};

export default NewBountyForm;