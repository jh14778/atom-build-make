'use babel';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import voucher from 'voucher';
import { EventEmitter } from 'events';

var Finder = require('fs-finder');

export const config = {
  jobs: {
    title: 'Simultaneous jobs',
    description: 'Limits how many jobs make will run simultaneously. Defaults to number of processors. Set to 1 for default behavior of make.',
    type: 'number',
    default: os.cpus().length,
    minimum: 1,
    maximum: os.cpus().length,
    order: 1
  },
  useMake: {
    title: 'Target extraction with make',
    description: 'Use `make` to extract targets. This may yield unwanted targets, or take a long time and a lot of resource.',
    type: 'boolean',
    default: false,
    order: 2
  }
};

export function provideBuilder() {
  const gccErrorMatch = '(?<file>([A-Za-z]:[\\/])?[^:\\n]+):(?<line>\\d+):(?<col>\\d+):\\s*(fatal error|error):\\s*(?<message>.+)';
  const xccErrorMatch = '(?<file>([A-Za-z]:[\\/])?[^:\\n]+):' +
    '(?<line>\\d+):' +
    '(?<col>\\d+):' +
    '\\s*(fatal error|error):\\s*(?<message>.+)';
  const errorMatch = [
    gccErrorMatch, xccErrorMatch
  ];

  const gccWarningMatch = '(?<file>([A-Za-z]:[\\/])?[^:\\n]+):(?<line>\\d+):(?<col>\\d+):\\s*(warning):\\s*(?<message>.+)';
  const xccWarningMatch = '(?<file>([A-Za-z]:[\\/])?[^:\\n]+):'
    '(?<line>\\d+):'
    '(?<col>\\d+):'
    '\\s*(warning):\\s*(?<message>.+)';
  const warningMatch = [
    gccWarningMatch, xccWarningMatch
  ];

  return class MakeBuildProvider extends EventEmitter {
    constructor(cwd) {
      super();
      this.cwd = cwd;
      this.files = Finder.from(cwd).find('Makefile');
      atom.config.observe('build-make.jobs', () => this.emit('refresh'));
    }

    getNiceName() {
      return 'XMOS XMake';
    }

    isEligible() {
      return this.files.length > 0;
    }

    settings() {
      return this.files.map(
        function(file) {
          const names = file.split(path.sep);
          const dir = names.slice(0, -1).reduce(
            function(a, b) {
              return a + path.sep + b;
            }
          );
          const cwd = dir + path.sep + '.build' + path.sep;
          const name = function(){
            if (names.length > 1) {
              return names[names.length - 2];
            } else {
              return 'root';
            }
          }();

          return [
            {
              exec: 'xmake',
              name: 'XMake: default : ' + name,
              args: ['-C', dir],
              sh: false,
              errorMatch: errorMatch,
              warningMatch: warningMatch,
              path: cwd
            },
            {
              exec: 'xmake',
              name: 'XMake: clean : ' + name,
              args: ['-C', dir, 'clean'],
              sh: false,
              errorMatch: errorMatch,
              warningMatch: warningMatch,
              path: cwd
            }
          ];
        }
      ).reduce(
        function(prev, curr) {
          return prev.concat(curr);
        }
      );
    }
  };
}
