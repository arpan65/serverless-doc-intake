#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InitStack } from '../lib/init-stack';

const app = new cdk.App();
new InitStack(app, 'InitStack');
