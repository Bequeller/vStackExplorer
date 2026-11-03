import type { TopicMeta } from '../types';

export const meta: TopicMeta = {
  topic: 'spring-boot',
  title: 'Spring Boot',
  group: 'Spring',
  summary: 'Spring MVC 요청 처리, `@Transactional` proxy, bean lifecycle, auto-configuration을 소스 코드 수준에서 따라갑니다.',
  order: 1,
  // Checked on spring.io (Spring Boot 4.1.2) and in spring-boot v4.1.2 gradle.properties
  // (springFrameworkVersion=7.0.10, tomcatVersion=11.0.27).
  versions: {
    'Spring Boot': '4.1.2',
    'Spring Framework': '7.0.10',
    'Apache Tomcat': '11.0.27',
  },
  checkedOn: '2026-11-03',
  lessons: ['request-flow'],
};
